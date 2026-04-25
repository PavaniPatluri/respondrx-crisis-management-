"""
Assignment Engine — Smart staff allocation based on role, availability, and proximity.

Logic:
  1. Filter staff by required roles
  2. Filter by availability
  3. Score by floor distance (nearest first)
  4. Assign one staff per required role
  5. Generate task descriptions
  6. Mark assigned staff as unavailable
"""

from models import db, Staff, Task
from datetime import datetime


TASK_DESCRIPTIONS = {
    ("fire",     "security"):     "Secure perimeter, manage evacuation on affected floors",
    ("fire",     "manager"):      "Coordinate all teams, lead guest evacuation, brief fire dept.",
    ("fire",     "housekeeping"): "Assist guest evacuation, check all rooms on affected floor",
    ("medical",  "medical"):      "Provide immediate first response to patient at location",
    ("medical",  "manager"):      "Coordinate with emergency services, manage guest welfare",
    ("medical",  "security"):     "Clear area, control crowd, guide ambulance team to location",
    ("security", "security"):     "Contain the security threat, detain individuals if necessary",
    ("security", "manager"):      "Coordinate with law enforcement, document the incident",
    ("flood",    "housekeeping"): "Deploy flood control equipment and assist guest relocation",
    ("flood",    "manager"):      "Shut water main, coordinate maintenance team",
    ("power",    "manager"):      "Activate backup generator, communicate status to all guests",
    ("power",    "housekeeping"): "Distribute emergency lighting, assist guests in dark areas",
    ("smoke",    "security"):     "Investigate smoke source, confirm if fire present",
    ("smoke",    "manager"):      "Initiate precautionary evacuation protocol",
    ("temp",     "housekeeping"): "Report to affected room, check HVAC and guest comfort",
}

DEFAULT_TASK_DESC = "Respond to {incident_type} incident at {location}"


class AssignmentEngine:

    @staticmethod
    def _is_night_shift() -> bool:
        """Night shift is 22:00 to 06:00."""
        hour = datetime.utcnow().hour
        return hour >= 22 or hour < 6

    def assign(self, incident, decision: dict) -> list[Task]:
        """
        Create tasks for each required role, assigning the nearest available staff.
        Modifies staff.available in DB.
        Returns list of created Task objects (not yet committed).
        """
        required_roles: list = decision["required_roles"]
        incident_floor: int = decision["floor"]
        is_night = self._is_night_shift()
        created_tasks = []
        assigned_ids = set()

        for role in required_roles:
            # Step 1: Filter by role + available (not already assigned in this batch)
            candidates: list[Staff] = Staff.query.filter_by(
                role=role, available=True
            ).all()

            # Step 2: Night Shift Logic — Reduce staff during night hours
            # Rule: If night, only staff with even IDs work (simulating a rotating shift)
            if is_night:
                candidates = [c for c in candidates if c.id % 2 == 0]

            # Step 3: Exclude staff already assigned in this same incident
            candidates = [c for c in candidates if c.id not in assigned_ids]

            if not candidates:
                # No available staff for this role — create unassigned task
                task = Task(
                    incident_id=incident.id,
                    assigned_staff_id=None,
                    role=role,
                    description=f"[UNASSIGNED] No available {role} staff (Night Shift) — manual assignment required",
                    status="pending",
                )
                created_tasks.append(task)
                continue

            # Step 4: Sort by floor distance (nearest first)
            sorted_staff = sorted(
                candidates,
                key=lambda s: abs(s.current_floor - incident_floor)
            )
            chosen: Staff = sorted_staff[0]
            assigned_ids.add(chosen.id)

            # Step 5: Build task description
            desc_key = (incident.type.lower(), role)
            description = TASK_DESCRIPTIONS.get(
                desc_key,
                DEFAULT_TASK_DESC.format(
                    incident_type=incident.type,
                    location=incident.location
                )
            )

            # Step 6: Mark staff unavailable
            chosen.available = False

            # Step 7: Create Task record
            task = Task(
                incident_id=incident.id,
                assigned_staff_id=chosen.id,
                role=role,
                description=description,
                status="pending",
                created_at=datetime.utcnow(),
            )
            created_tasks.append(task)

        return created_tasks
