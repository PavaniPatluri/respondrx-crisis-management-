from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False) # admin, manager, staff

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role
        }


class Incident(db.Model):
    __tablename__ = "incidents"
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)           # fire, medical, security, smoke, temp
    location = db.Column(db.String(100), nullable=False)      # e.g. "Room 302"
    floor = db.Column(db.Integer, nullable=False, default=1)
    severity = db.Column(db.String(20), default="low")        # low/medium/high/critical
    priority_score = db.Column(db.Integer, default=0)
    explanation = db.Column(db.Text, default="")              # XAI Reasoning (Why)
    why_not_explanation = db.Column(db.Text, default="")      # XAI Reasoning (Why Not)
    affected_zones = db.Column(db.Text, default="")           # comma-separated
    recommended_actions = db.Column(db.Text, default="")      # newline-separated
    status = db.Column(db.String(20), default="active")       # active, resolved, predicted
    vip_present = db.Column(db.Boolean, default=False)
    time_to_critical = db.Column(db.Integer, default=0)         # seconds
    impact_score = db.Column(db.Integer, default=0)             # 0-100
    evacuation_path = db.Column(db.Text, default="")            # JSON or comma-separated
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    tasks = db.relationship("Task", backref="incident", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "location": self.location,
            "floor": self.floor,
            "severity": self.severity,
            "priority_score": self.priority_score,
            "explanation": self.explanation,
            "why_not_explanation": self.why_not_explanation,
            "affected_zones": self.affected_zones.split(",") if self.affected_zones else [],
            "recommended_actions": self.recommended_actions.split("|") if self.recommended_actions else [],
            "status": self.status,
            "vip_present": self.vip_present,
            "time_to_critical": self.time_to_critical,
            "impact_score": self.impact_score,
            "evacuation_path": self.evacuation_path.split("|") if self.evacuation_path else [],
            "timestamp": self.timestamp.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


class Staff(db.Model):
    __tablename__ = "staff"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)           # security, medical, housekeeping, manager
    current_floor = db.Column(db.Integer, default=1)
    current_location = db.Column(db.String(100), default="Lobby")
    available = db.Column(db.Boolean, default=True)
    tasks = db.relationship("Task", backref="staff", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "current_floor": self.current_floor,
            "current_location": self.current_location,
            "available": self.available,
        }


class Task(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False)
    assigned_staff_id = db.Column(db.Integer, db.ForeignKey("staff.id"), nullable=True)
    role = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="pending")      # pending, in_progress, completed, delayed
    expected_duration_seconds = db.Column(db.Integer, default=300) # Efficiency Baseline
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        resp_time = None
        efficiency = None
        if self.completed_at and self.created_at:
            resp_time = int((self.completed_at - self.created_at).total_seconds())
            efficiency = round((self.expected_duration_seconds / max(resp_time, 1)) * 100)
            
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "assigned_staff_id": self.assigned_staff_id,
            "staff_name": self.staff.name if self.staff else "Unassigned",
            "role": self.role,
            "description": self.description,
            "status": self.status,
            "expected_duration": self.expected_duration_seconds,
            "actual_duration": resp_time,
            "efficiency_score": efficiency,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class EventLog(db.Model):
    """Forensic audit log for Replay Mode."""
    __tablename__ = "event_logs"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, nullable=False)
    event_type = db.Column(db.String(50))   # e.g. "INCIDENT_CREATED", "STAFF_ASSIGNED"
    description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    metadata_json = db.Column(db.Text)      # Store additional context as stringified JSON

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "event_type": self.event_type,
            "description": self.description,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata_json
        }


class IncidentLog(db.Model):
    """Post-incident analytics record."""
    __tablename__ = "incident_logs"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, nullable=False)
    incident_type = db.Column(db.String(50))
    location = db.Column(db.String(100))
    severity = db.Column(db.String(20))
    total_response_time = db.Column(db.Integer)
    avg_efficiency = db.Column(db.Integer)
    total_tasks = db.Column(db.Integer, default=0)
    completed_tasks = db.Column(db.Integer, default=0)
    delayed_tasks = db.Column(db.Integer, default=0)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "incident_type": self.incident_type,
            "location": self.location,
            "severity": self.severity,
            "total_response_time": self.total_response_time,
            "avg_efficiency": self.avg_efficiency,
            "total_tasks": self.total_tasks,
            "completed_tasks": self.completed_tasks,
            "delayed_tasks": self.delayed_tasks,
            "logged_at": self.logged_at.isoformat(),
        }


# ─── Seed Data ──────────────────────────────────────────────────────────────
STAFF_SEED = [
    {"name": "Marcus Cole",     "role": "security",     "current_floor": 1, "current_location": "Main Entrance"},
    {"name": "Diana Reyes",     "role": "security",     "current_floor": 3, "current_location": "Floor 3 Corridor"},
    {"name": "Leo Vasquez",     "role": "security",     "current_floor": 5, "current_location": "Rooftop Access"},
    {"name": "Dr. Priya Nair",  "role": "medical",      "current_floor": 2, "current_location": "Medical Station"},
    {"name": "James Okafor",    "role": "medical",      "current_floor": 4, "current_location": "Floor 4 Wing B"},
    {"name": "Sofia Mendez",    "role": "housekeeping", "current_floor": 2, "current_location": "Room 210"},
    {"name": "Chen Wei",        "role": "housekeeping", "current_floor": 3, "current_location": "Room 305"},
    {"name": "Amara Osei",      "role": "housekeeping", "current_floor": 6, "current_location": "Floor 6 Lounge"},
    {"name": "Victoria Shaw",   "role": "manager",      "current_floor": 1, "current_location": "Front Desk"},
    {"name": "Arjun Mehta",     "role": "manager",      "current_floor": 7, "current_location": "Executive Suite"},
]


def seed_staff(db_instance):
    if Staff.query.count() == 0:
        for s in STAFF_SEED:
            db_instance.session.add(Staff(**s))
        db_instance.session.commit()
        print("[SEED] Staff table populated.")

USER_SEED = [
    {"username": "admin", "password": "admin123", "role": "admin"},
    {"username": "manager", "password": "manager123", "role": "manager"},
    {"username": "staff1", "password": "staff123", "role": "staff"},
]

def seed_users(db_instance):
    if User.query.count() == 0:
        for u in USER_SEED:
            db_instance.session.add(User(**u))
        db_instance.session.commit()
        print("[SEED] Users table populated.")
