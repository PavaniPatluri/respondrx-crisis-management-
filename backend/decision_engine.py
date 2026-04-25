"""
Decision Engine — Rule-based incident analysis.

Input:  incident_type, floor, vip_present, timestamp
Output: severity, priority_score, affected_zones,
        required_roles, recommended_actions
"""

from datetime import datetime


# ─── Constants ───────────────────────────────────────────────────────────────
SEVERITY_WEIGHTS = {
    "fire":     {"base_severity": "critical", "base_score": 90},
    "medical":  {"base_severity": "high",     "base_score": 70},
    "security": {"base_severity": "medium",   "base_score": 55},
    "flood":    {"base_severity": "high",     "base_score": 65},
    "power":    {"base_severity": "medium",   "base_score": 50},
    "smoke":    {"base_severity": "high",     "base_score": 75},  # IoT: smoke detector
    "temp":     {"base_severity": "low",      "base_score": 30},  # IoT: temperature spike
}

ROLE_REQUIREMENTS = {
    "fire":     ["security", "manager"],
    "medical":  ["medical", "manager"],
    "security": ["security", "manager"],
    "flood":    ["housekeeping", "manager"],
    "power":    ["manager", "housekeeping"],
    "smoke":    ["security", "manager"],
    "temp":     ["housekeeping"],
}

ACTION_TEMPLATES = {
    "fire": [
        "Activate fire alarm and notify all floors",
        "Begin staged evacuation of affected zones",
        "Contact fire department immediately",
        "Seal stairwells, cut HVAC to prevent smoke spread",
        "Account for all guests via emergency roster",
    ],
    "medical": [
        "Dispatch nearest medical staff to location",
        "Call emergency services (ambulance)",
        "Clear area of bystanders",
        "Prepare first-aid kit at incident location",
        "Notify hotel manager + guest's emergency contact",
    ],
    "security": [
        "Deploy security team to contain area",
        "Review CCTV footage immediately",
        "Lock down access to affected zone",
        "Notify local law enforcement if required",
        "Document incident with photographic evidence",
    ],
    "flood": [
        "Shut off main water supply to affected floor",
        "Evacuate guests from flooded rooms",
        "Deploy housekeeping with mops and pumps",
        "Notify facilities management",
        "Move guest belongings to safe storage",
    ],
    "power": [
        "Switch to backup generator",
        "Notify all guests of temporary outage",
        "Dispatch housekeeping with flashlights",
        "Contact electrical maintenance team",
        "Verify elevator status and safety",
    ],
    "smoke": [
        "Activate smoke alarm system",
        "Evacuate floor and adjacent areas",
        "Investigate smoke source immediately",
        "Prepare fire suppression equipment",
        "Coordinate with fire department on standby",
    ],
    "temp": [
        "Check HVAC system for malfunction",
        "Dispatch housekeeping to affected room",
        "Offer room change to affected guests",
        "Document sensor reading for maintenance",
    ],
}


# ─── Core Engine ─────────────────────────────────────────────────────────────
class DecisionEngine:

    @staticmethod
    def _extract_floor(location: str) -> int:
        """Extract floor number from location string like 'Room 302' → 3."""
        import re
        # Match 'Floor N' or 'Rm/Room NNN' or plain integers
        match = re.search(r'\b(\d+)\b', location)
        if match:
            num = int(match.group(1))
            if num > 100:          # Room number like 302 → floor 3
                return num // 100
            return num             # Already a floor number
        return 1                   # Default: ground floor

    @staticmethod
    def _is_night_time(ts: datetime) -> bool:
        """Night = 22:00 – 06:00 UTC."""
        hour = ts.hour
        return hour >= 22 or hour < 6

    @staticmethod
    def _get_affected_zones(floor: int, incident_type: str) -> list:
        """Return list of affected floor strings based on incident type."""
        if incident_type in ("fire", "smoke"):
            # Fire spreads: floor above + below
            zones = set()
            for f in [floor - 1, floor, floor + 1]:
                if f >= 1:
                    zones.add(f"Floor {f}")
            return sorted(list(zones))
        elif incident_type == "medical":
            return [f"Floor {floor}"]
        elif incident_type == "security":
            # Cordon off incident floor + immediate adjacent
            zones = set()
            for f in [floor - 1, floor, floor + 1]:
                if f >= 1:
                    zones.add(f"Floor {f}")
            return sorted(list(zones))
        elif incident_type in ("flood", "power"):
            return [f"Floor {floor}"]
        else:
            return [f"Floor {floor}"]

    def calculate_time_to_critical(self, incident_type: str, severity: str, staff_count: int) -> int:
        """Predict seconds remaining before incident escalates to maximum risk."""
        base_times = {
            "fire": 180,
            "smoke": 300,
            "medical": 240,
            "security": 420,
            "flood": 600,
            "power": 900
        }
        
        time = base_times.get(incident_type, 300)
        
        # Adjust based on current severity
        if severity == "high":
            time *= 0.6
        elif severity == "medium":
            time *= 0.8
            
        # Adjust based on staff presence (more staff = slower failure)
        if staff_count > 0:
            time *= (1 + (staff_count * 0.5))
            
        return int(time)

    def calculate_impact_score(self, severity: str, affected_zones_count: int, vip: bool) -> int:
        """Calculate overall risk impact score (0-100)."""
        severity_base = {"low": 15, "medium": 40, "high": 70, "critical": 90}
        score = severity_base.get(severity, 20)
        
        score += (affected_zones_count * 5)
        if vip:
            score += 15
            
        return min(int(score), 100)

    def calculate_evacuation_path(self, floor: int, location: str, incidents: list) -> list:
        """Suggest safest path coordinates (floor, room) avoiding danger zones."""
        # Simple Logic: Prefer nearest exit (Room 1 or Room 8) 
        # that is not on a floor with a critical incident.
        target_floor = 1 # Lobby is the goal
        
        path = []
        current_floor = floor
        
        # Room extraction
        import re
        match = re.search(r'(\d+)$', location)
        current_room = int(match.group(1)) % 100 if match else 4
        
        # Determine safest exit direction
        left_exit_risk = 0
        right_exit_risk = 0
        
        for inc in incidents:
            if inc.get('severity') == 'critical':
                if inc.get('floor') == floor:
                    # Incident on current floor
                    match_inc = re.search(r'(\d+)$', inc.get('location', ''))
                    inc_room = int(match_inc.group(1)) % 100 if match_inc else 4
                    if inc_room < current_room: left_exit_risk += 10
                    else: right_exit_risk += 10
        
        exit_room = 1 if left_exit_risk <= right_exit_risk else 8
        
        # Build path: Current Room -> Exit of Floor -> Exit of Ground Floor
        # On current floor
        step = -1 if exit_room < current_room else 1
        for r in range(current_room, exit_room + step, step):
            if 1 <= r <= 8:
                path.append({"floor": current_floor, "room": r})
        
        # Vertical descent (simplified: just room at exit for each floor)
        for f in range(current_floor - 1, target_floor - 1, -1):
            path.append({"floor": f, "room": exit_room})
            
        return path

    def analyze(
        self,
        incident_type: str,
        location: str,
        vip_present: bool = False,
        timestamp: datetime = None,
        active_incidents: list = None,
        staff_assigned_count: int = 0
    ) -> dict:
        """
        Core rule-based analysis with XAI (Explainable) output.
        """
        if timestamp is None:
            timestamp = datetime.utcnow()
        if active_incidents is None:
            active_incidents = []

        itype = incident_type.lower()
        floor = self._extract_floor(location)
        night = self._is_night_time(timestamp)
        reasons = []
        reasons_not = []

        # ── Base values from type ─────────────────────────────────────────
        base = SEVERITY_WEIGHTS.get(itype, {"base_severity": "low", "base_score": 20})
        severity = base["base_severity"]
        score = base["base_score"]
        reasons.append(f"Initial '{itype}' detection at {location} (Base Score: {score}).")

        # ── Rule: VIP present → escalate ─────────────────────────────────
        if vip_present:
            score = min(score + 10, 100)
            severity_ladder = ["low", "medium", "high", "critical"]
            current_idx = severity_ladder.index(severity)
            if current_idx < 2:  # below "high"
                severity = severity_ladder[min(current_idx + 1, 3)]
            reasons.append(f"VIP guest at {location} triggered priority escalation (+10).")

        # ── Rule: Night time → critical staffing concern ──────────────────
        if night:
            score = min(score + 5, 100)
            reasons.append("Incident occurred during Night Shift (22:00-06:00); staff availability restricted.")

        # ── Rule: High floor (≥ 5) → harder evacuation ──────────────────
        if floor >= 5:
            score = min(score + 5, 100)
            reasons.append(f"Location is on Floor {floor}; increased vertical evacuation complexity.")

        # ── Rule: Top floor fire → critical regardless ────────────────────
        if itype == "fire" and floor >= 6:
            severity = "critical"
            score = min(score + 5, 100)
            reasons.append("Critical Alert: Fire on upper residential floor posing maximum containment risk.")

        # ── Derived outputs ───────────────────────────────────────────────
        affected_zones = DecisionEngine._get_affected_zones(floor, itype)
        required_roles = ROLE_REQUIREMENTS.get(itype, ["manager"])
        actions = ACTION_TEMPLATES.get(itype, ["Assess situation and report to manager"])

        if itype in ("fire", "smoke"):
            reasons.append(f"Zoning Warning: Potential smoke/fire spread to floors {floor-1} and {floor+1}.")
            reasons_not.append("Medical team not assigned because no active casualties reported yet.")
            reasons_not.append("Housekeeping not assigned because environment is structurally unsafe.")
        elif itype == "medical":
            reasons_not.append("Security not actively assigned because no threat or breach was detected.")
            reasons_not.append("Evacuation protocols bypassed because incident is strictly isolated.")
        else:
            reasons_not.append("Mass evacuation not recommended as incident does not breach safety thresholds.")

        # ── Priority labeling ─────────────────────────────────────────────
        if score >= 85:
            priority_label = "IMMEDIATE"
        elif score >= 65:
            priority_label = "URGENT"
        elif score >= 45:
            priority_label = "ELEVATED"
        else:
            priority_label = "ROUTINE"

        # ── Advanced Metrics ─────────────────────────────────────────────
        time_to_crit = self.calculate_time_to_critical(itype, severity, staff_assigned_count)
        impact_score = self.calculate_impact_score(severity, len(affected_zones), vip_present)
        evac_path = self.calculate_evacuation_path(floor, location, active_incidents)

        return {
            "floor": floor,
            "severity": severity,
            "priority_score": score,
            "priority_label": priority_label,
            "explanation": " -> ".join(reasons),
            "why_not_explanation": " | ".join(reasons_not),
            "affected_zones": affected_zones,
            "required_roles": required_roles,
            "recommended_actions": actions,
            "night_time": night,
            "vip_escalated": vip_present,
            "time_to_critical": time_to_crit,
            "impact_score": impact_score,
            "evacuation_path": evac_path
        }

    def predict_risk(self, sensor_type: str, value: float, location: str) -> dict:
        """
        Predictive analysis: Warnings BEFORE incidents happen.
        Returns prediction dict or None.
        """
        if sensor_type == "temp" and 40 <= value < 45:
            return {
                "type": "pred_fire",
                "risk_level": "WARNING",
                "likelihood": "MODERATE",
                "location": location,
                "description": f"Rising temperature ({value}°C) detected at {location}. Potential fire risk within 15-30 mins.",
                "action": "Dispatch housekeeping to check HVAC and local environment."
            }
        elif sensor_type == "smoke" and 30 <= value < 50:
            return {
                "type": "pred_fire",
                "risk_level": "CAUTION",
                "likelihood": "HIGH",
                "location": location,
                "description": f"Particle density increasing ({value}ppm) at {location}. Smoke source possible.",
                "action": "Alert security to investigate ventilation shafts."
            }
        return None
