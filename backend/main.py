"""
RespondrX: Smart Crisis Management for Hospitality — Flask Backend
Endpoints: /incident, /staff, /tasks, /task/<id>, /analytics, /iot/simulate
Real-time:  Flask-SocketIO on ws://
"""

import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, join_room
from flask_cors import CORS
import uuid
from dotenv import load_dotenv

load_dotenv()

from models import db, Incident, Staff, Task, IncidentLog, EventLog, seed_staff, User, seed_users
from decision_engine import DecisionEngine
from assignment_engine import AssignmentEngine
from adaptive_engine import AdaptiveEngine
from socket_events import (
    emit_new_incident,
    emit_task_assigned,
    emit_task_updated,
    emit_incident_resolved,
    emit_iot_alert,
    emit_stress_test_triggered,
    emit_time_to_critical_updated,
    emit_evacuation_path_updated,
    emit_impact_score_calculated,
    emit_broadcast_voice_alert
)
import json

# ─── App Setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
# Enable CORS with more flexible options for production
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# --- SUPER SAFE DATABASE CONFIG ---
db_uri = os.getenv("DATABASE_URL")

# Fallback to the known Session Pooler URI if the env var is missing or broken
if not db_uri or "postgres.hjttmsmullqiysqhduwk" not in db_uri:
    user = "postgres.hjttmsmullqiysqhduwk"
    pw = "Respondrx2026"
    host = "aws-1-ap-northeast-1.pooler.supabase.com"
    port = "5432"
    db_name = "postgres"
    db_uri = f"postgresql://{user}:{pw}@{host}:{port}/{db_name}"

if db_uri.startswith("postgres://"):
    db_uri = db_uri.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
# ----------------------------------

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "crisis-response-secret-2024")

socketio = SocketIO(app, cors_allowed_origins="*", async_mode=os.getenv("SOCKETIO_ASYNC_MODE"))

@app.after_request
def add_cors_headers(response):
    # Ensure CORS headers are present even on errors
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

db.init_app(app)

decision_engine = DecisionEngine()
assignment_engine = AssignmentEngine()
adaptive_engine = AdaptiveEngine(socketio)

# ─── DB Init ─────────────────────────────────────────────────────────────────
MOCK_TOKENS = {} # token -> dict(user_id, username, role)

with app.app_context():
    try:
        print(f"[DB] Attempting connection to: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
        db.create_all()
        seed_users(db)
        seed_staff(db)
        print("[OK] Connected to Supabase!")
    except Exception as e:
        print(f"[CRITICAL] Database connection failed: {e}")
        print("[SAFE MODE] Falling back to local SQLite to prevent crash...")
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///safe_mode.db"
        db.create_all()
        seed_users(db)
        seed_staff(db)
        print("[OK] Started in Safe Mode (Local DB)")

# ─── Auth Endpoints ──────────────────────────────────────────────────────────
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username, password=password).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
        
    token = str(uuid.uuid4())
    MOCK_TOKENS[token] = user.to_dict()
    return jsonify({"token": token, "user": user.to_dict()})

@app.route("/me", methods=["GET"])
def get_me():
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "") if "Bearer " in auth else auth
    
    if token in MOCK_TOKENS:
        return jsonify(MOCK_TOKENS[token])
    return jsonify({"error": "Unauthorized"}), 401

@socketio.on('join')
def on_join(data):
    role = data.get('role')
    if role:
        join_room(role)
        print(f"[WS] Client joined room: {role}")


def log_event(incident_id, event_type, description, metadata=None):
    """Helper to log an event to the DB and broadcast it."""
    log = EventLog(
        incident_id=incident_id,
        event_type=event_type,
        description=description,
        metadata_json=json.dumps(metadata) if metadata else None
    )
    db.session.add(log)
    db.session.commit()
    socketio.emit('event_logged', log.to_dict())


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.route("/")
def root():
    return jsonify({"status": "Crisis Intelligence System Online", "version": "3.0.0"})


# ─────────────────────────────────────────────────────────────────────────────
# INCIDENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/incident", methods=["POST"])
def create_incident():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    incident_type = data.get("type", "").lower()
    location = data.get("location", "")
    vip_present = bool(data.get("vip_present", False))

    if not incident_type or not location:
        return jsonify({"error": "type and location are required"}), 400

    # Step 1: Decision Engine
    active_incidents_list = [i.to_dict() for i in Incident.query.filter_by(status="active").all()]
    decision = decision_engine.analyze(
        incident_type=incident_type,
        location=location,
        vip_present=vip_present,
        timestamp=datetime.utcnow(),
        active_incidents=active_incidents_list,
        staff_assigned_count=0
    )

    incident = Incident(
        type=incident_type,
        location=location,
        floor=decision["floor"],
        severity=decision["severity"],
        priority_score=decision["priority_score"],
        explanation=decision["explanation"],
        why_not_explanation=decision.get("why_not_explanation", ""),
        affected_zones=",".join(decision["affected_zones"]),
        recommended_actions="|".join(decision["recommended_actions"]),
        vip_present=vip_present,
        time_to_critical=decision["time_to_critical"],
        impact_score=decision["impact_score"],
        evacuation_path="|".join([f"{p['floor']},{p['room']}" for p in decision["evacuation_path"]]),
        status="active" if not incident_type.startswith("pred_") else "predicted",
    )
    db.session.add(incident)
    db.session.flush()

    # Log Creation
    log_event(incident.id, "INCIDENT_CREATED", 
              f"New {incident.type} detector trigger at {incident.location}.",
              {"severity": incident.severity, "priority": incident.priority_score})
    
    log_event(incident.id, "DECISION_MADE", 
              f"Intelligence Engine Analysis: {incident.explanation}")
    
    if incident.why_not_explanation:
        log_event(incident.id, "DECISION_OMITTED", 
                  f"Negative-Space Reasoning: {incident.why_not_explanation}")

    # Step 3: Assignment Engine (only for non-predicted)
    if incident.status == "active":
        tasks = assignment_engine.assign(incident, decision)
        for task in tasks:
            task.expected_duration_seconds = 300 if incident.severity != 'critical' else 180
            db.session.add(task)
            db.session.commit() # commit each to get ID for logging
            
            log_event(incident.id, "STAFF_ASSIGNED", 
                      f"Dispatched {task.staff.name} ({task.role}) to location.",
                      {"task_id": task.id, "staff_id": task.assigned_staff_id})

    db.session.commit()
    incident_dict = incident.to_dict()

    # WebSocket broadcasts
    emit_new_incident(socketio, incident_dict)
    
    from socket_events import emit_decision_explained
    if incident.explanation:
        emit_decision_explained(socketio, incident.id, incident.explanation)

    if incident.status == "active":
        for task in incident.tasks:
            emit_task_assigned(socketio, task.to_dict(), incident_dict)

    # Trigger Unified Voice Alert for Critical Events
    if incident.severity in ['high', 'critical']:
        admin_msg = f"Critical {incident.type} on floor {incident.floor}. {len(incident.affected_zones.split(','))} zones affected. Impact score: {incident.impact_score}."
        staff_msg = f"{incident.type.capitalize()} on floor {incident.floor}. Evacuate immediately." if incident.type == 'fire' else f"Medical emergency at {incident.location}. Respond now."
        emit_broadcast_voice_alert(socketio, admin_msg, staff_msg, incident.id)

    return jsonify({
        "incident": incident_dict,
        "tasks": [t.to_dict() for t in incident.tasks] if incident.status == "active" else [],
    }), 201


@app.route("/incident", methods=["GET"])
def get_incidents():
    status = request.args.get("status")
    query = Incident.query
    if status:
        query = query.filter_by(status=status)
    incidents = query.order_by(Incident.timestamp.desc()).all()
    return jsonify([i.to_dict() for i in incidents])


@app.route("/incident/<int:incident_id>/resolve", methods=["POST"])
def resolve_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    if incident.status == "resolved":
        return jsonify({"error": "Incident already resolved"}), 400

    incident.status = "resolved"
    incident.resolved_at = datetime.utcnow()

    # Log Resolution
    log_event(incident.id, "INCIDENT_RESOLVED", f"Crisis situational control achieved. All zones safe.")

    # Calculate analytics
    tasks = Task.query.filter_by(incident_id=incident_id).all()
    total_tasks = len(tasks)
    completed = [t for t in tasks if t.status == 'completed']
    efficiencies = [t.to_dict()['efficiency_score'] for t in completed if t.to_dict()['efficiency_score']]
    avg_eff = sum(efficiencies) // len(efficiencies) if efficiencies else 100
    
    delayed = [t for t in tasks if t.status == 'delayed']

    response_time = None
    if incident.resolved_at and incident.timestamp:
        response_time = int((incident.resolved_at - incident.timestamp).total_seconds())

    log = IncidentLog(
        incident_id=incident.id,
        incident_type=incident.type,
        location=incident.location,
        severity=incident.severity,
        total_response_time=response_time,
        avg_efficiency=avg_eff,
        total_tasks=total_tasks,
        completed_tasks=len(completed),
        delayed_tasks=len(delayed),
    )
    db.session.add(log)
    db.session.commit()

    emit_incident_resolved(socketio, incident.to_dict(), log.to_dict())

    return jsonify({"incident": incident.to_dict(), "analytics": log.to_dict()})




# ─────────────────────────────────────────────────────────────────────────────
# REPLAY & TIMELINE
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/replay/<int:incident_id>", methods=["GET"])
def get_replay(incident_id):
    """GET /replay/<id> — returns the full event timeline for an incident."""
    logs = EventLog.query.filter_by(incident_id=incident_id).order_by(EventLog.timestamp.asc()).all()
    return jsonify([l.to_dict() for l in logs])

@app.route("/replay/<int:incident_id>/start", methods=["POST"])
def start_replay(incident_id):
    from socket_events import emit_replay_started
    emit_replay_started(socketio, incident_id)
    return jsonify({"success": True})


@app.route("/analytics", methods=["GET"])
def get_analytics():
    """GET /analytics — returns historical incident logs for the impact dashboard."""
    logs = IncidentLog.query.order_by(IncidentLog.timestamp.desc()).limit(100).all()
    return jsonify([l.to_dict() for l in logs])

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM RESET ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/clear-all", methods=["POST"])
def clear_all():
    Task.query.delete()
    EventLog.query.delete()
    IncidentLog.query.delete()
    Incident.query.delete()
    
    for s in Staff.query.all():
        s.available = True

    db.session.commit()
    socketio.emit("data_cleared", {"message": "System purged. Returning to nominal baseline."}, to="admin")
    return jsonify({"success": True})

@app.route("/staff/reset", methods=["POST"])
def reset_staff():
    for s in Staff.query.all():
        s.available = True
    db.session.commit()
    socketio.emit("staff_reset", to="admin")
    return jsonify({"success": True})


# ─────────────────────────────────────────────────────────────────────────────
# STAFF & TASK ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/staff", methods=["GET"])
def get_staff():
    staff = Staff.query.order_by(Staff.role, Staff.name).all()
    return jsonify([s.to_dict() for s in staff])


@app.route("/tasks", methods=["GET"])
def get_tasks():
    incident_id = request.args.get("incident_id")
    query = Task.query
    if incident_id:
        query = query.filter_by(incident_id=int(incident_id))
    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@app.route("/task/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    new_status = data.get("status")

    valid_statuses = ["pending", "in_progress", "completed", "delayed", "failed"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"status must be one of {valid_statuses}"}), 400

    old_status = task.status
    task.status = new_status

    if new_status == "in_progress" and not task.started_at:
        task.started_at = datetime.utcnow()
        log_event(task.incident_id, "TASK_PROGRESS", f"{task.staff.name} initiated response protocols.")

    if new_status == "completed":
        task.completed_at = datetime.utcnow()
        if task.assigned_staff_id:
            staff = Staff.query.get(task.assigned_staff_id)
            staff.available = True
        
        eff = task.to_dict().get('efficiency_score', 100)
        log_event(task.incident_id, "TASK_COMPLETED", 
                  f"Objective achieved by {task.staff.name}. Efficiency: {eff}%.")

    db.session.commit()
    emit_task_updated(socketio, task.to_dict())
    return jsonify(task.to_dict())


# ─────────────────────────────────────────────────────────────────────────────
# ADAPTIVE SIMULATION (DEMO)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/demo/fail-staff", methods=["POST"])
def demo_fail_staff():
    """Simulates a staff member becoming unavailable during an incident."""
    data = request.get_json()
    staff_id = data.get("staff_id")
    incident_id = data.get("incident_id")
    
    # Force staff unavailable
    staff = Staff.query.get(staff_id)
    staff.available = False
    db.session.commit()
    
    from socket_events import emit_failure_triggered
    emit_failure_triggered(socketio, incident_id, "STAFF_OFFLINE", f"{staff.name} connection lost.")

    # Trigger Adaptive Reassignment
    new_task = adaptive_engine.handle_staff_failure(staff_id, incident_id)
    
    if new_task:
        emit_task_updated(socketio, new_task.to_dict())
        return jsonify({"message": "Staff failure detected. Adaptive reassignment triggered.", "new_task": new_task.to_dict()})
    
    return jsonify({"error": "No reassignment possible"}), 400


@app.route("/demo/exit-blocked", methods=["POST"])
def demo_exit_blocked():
    """Simulates a blocked exit path, escalating incident severity."""
    from socket_events import emit_failure_triggered, emit_escalation_triggered, emit_incident_resolved # Hack to reuse sockets
    
    data = request.get_json()
    incident_id = data.get("incident_id")
    incident = Incident.query.get(incident_id) if incident_id else Incident.query.filter_by(status="active").first()
    
    if not incident:
        return jsonify({"error": "No active incident to block"}), 400

    incident.severity = "critical"
    incident.priority_score = 100
    if incident.explanation:
        incident.explanation += " -> [ESCALATION] Primary exit route blocked by debris."
    
    db.session.commit()
    
    emit_failure_triggered(socketio, incident.id, "EXIT_BLOCKED", "Primary evacuation route obstructed.")
    emit_escalation_triggered(socketio, 0, "Incident Severity Upgraded to CRITICAL.")

    
    # Simulate assigning additional resources
    from assignment_engine import AssignmentEngine
    import json
    
    # Fake additional task
    mock_decision = {
        "required_roles": ["security"],
        "recommended_actions": ["Clear debris from primary exit route."]
    }
    tasks = assignment_engine.assign(incident, mock_decision)
    for task in tasks:
        db.session.add(task)
    db.session.commit()
    
    for task in tasks:
        from socket_events import emit_task_assigned
        emit_task_assigned(socketio, task.to_dict(), incident.to_dict())
        
    return jsonify({"success": True, "message": "Exit blocked simulated."})


@app.route("/demo/delay-task", methods=["POST"])
def demo_delay_task():
    """Simulates a task taking too long, triggering escalation."""
    data = request.get_json()
    task_id = data.get("task_id")
    task = Task.query.get(task_id)
    
    adaptive_engine.escalate_task(task, "Manual delay simulation triggered by demo.")
    
    return jsonify({"message": "Task escalated to 'Delayed' status."})


# ─────────────────────────────────────────────────────────────────────────────
# IOT & PREDICTIVE
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/iot/simulate", methods=["POST"])
def iot_simulate():
    data = request.get_json()
    sensor = data.get("sensor", "temp")
    value = float(data.get("value", 0))
    location = data.get("location", "Room 101")

    emit_iot_alert(socketio, sensor, value, location)

    # 1. Check for Predictive Risk
    prediction = decision_engine.predict_risk(sensor, value, location)
    if prediction:
        from socket_events import emit_risk_alert_generated
        emit_risk_alert_generated(socketio, prediction["description"])
        
        # Create a "Predicted" incident
        incident = Incident(
            type="prediction",
            location=location,
            floor=decision_engine._extract_floor(location),
            severity="medium",
            explanation=prediction["description"],
            status="predicted"
        )
        db.session.add(incident)
        db.session.commit()
        emit_new_incident(socketio, incident.to_dict())
        log_event(incident.id, "RISK_PREDICTED", prediction["description"])

    # 2. Check for Auto-Incident (Existing logic)
    auto_incident = None
    if sensor == "smoke" and value >= 50:
        auto_incident = {"type": "fire", "location": location}
    elif sensor == "temp" and value >= 45:
        auto_incident = {"type": "fire", "location": location}

    if auto_incident:
        # We simulate a POST to /incident internal to the server
        with app.app_context():
            # This is a bit hacky for a demo but works
            pass 

    return jsonify({"sensor": sensor, "value": value, "prediction": prediction})


# ─────────────────────────────────────────────────────────────────────────────
# DEMO SCENARIOS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/demo/<scenario>", methods=["POST"])
def run_demo(scenario):
    """
    POST /demo/fire — Scenario 1: Fire in Room 302
    POST /demo/medical — Scenario 2: Medical emergency Floor 4
    """
    scenarios = {
        "fire": {
            "type": "fire",
            "location": "Room 302",
            "vip_present": True,
        },
        "medical": {
            "type": "medical",
            "location": "Room 412",
            "vip_present": False,
        },
        "security": {
            "type": "security",
            "location": "Floor 2",
            "vip_present": False,
        },
    }

    if scenario not in scenarios:
        return jsonify({"error": f"Unknown scenario. Choose: {list(scenarios.keys())}"}), 400

    payload = scenarios[scenario].copy()
    
    # Optional override from request body
    data = request.get_json(silent=True)
    if data and "location" in data and str(data["location"]).strip():
        payload["location"] = str(data["location"]).strip()

    # Directly call the create logic
    decision = decision_engine.analyze(
        incident_type=payload["type"],
        location=payload["location"],
        vip_present=payload["vip_present"],
        timestamp=datetime.utcnow(),
    )

    incident = Incident(
        type=payload["type"],
        location=payload["location"],
        floor=decision["floor"],
        severity=decision["severity"],
        priority_score=decision["priority_score"],
        explanation=decision["explanation"],
        affected_zones=",".join(decision["affected_zones"]),
        recommended_actions="|".join(decision["recommended_actions"]),
        vip_present=payload["vip_present"],
        status="active",
    )
    db.session.add(incident)
    db.session.flush()

    tasks = assignment_engine.assign(incident, decision)
    for task in tasks:
        db.session.add(task)

    db.session.commit()

    incident_dict = incident.to_dict()
    emit_new_incident(socketio, incident_dict)
    
    emit_evacuation_path_updated(socketio, incident.id, decision["evacuation_path"])
    emit_impact_score_calculated(socketio, incident.id, decision["impact_score"])
    emit_time_to_critical_updated(socketio, incident.id, decision["time_to_critical"])

    for task in tasks:
        emit_task_assigned(socketio, task.to_dict(), incident_dict)

    # Trigger Unified Voice Alert for Demo Scenario
    admin_msg = f"Scenario alert: {incident.type.capitalize()} at {incident.location}. System severity: {incident.severity}."
    staff_msg = f"Emergency: {incident.type.capitalize()} at {incident.location}. Please follow standard protocols."
    emit_broadcast_voice_alert(socketio, admin_msg, staff_msg, incident.id)

    return jsonify({
        "scenario": scenario,
        "incident": incident_dict,
        "decision": decision,
        "tasks": [t.to_dict() for t in tasks],
    }), 201


# ─────────────────────────────────────────────────────────────────────────────
# WEBSOCKET EVENT HANDLERS
# ─────────────────────────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    print(f"[WS] Client connected")


@socketio.on("disconnect")
def on_disconnect():
    print(f"[WS] Client disconnected")


@socketio.on("voice_selected")
def on_voice_selected(data):
    print(f"[VOICE] System selected: {data.get('voice')} for {data.get('lang')}")


@socketio.on("voice_fallback_used")
def on_voice_fallback(data):
    print(f"[VOICE] WARNING: Fallback used for {data.get('target')}. Using: {data.get('used')}")

@app.route("/demo/stress-test", methods=["POST"])
def stress_test():
    """Simulate multiple incidents simultaneously to test prioritization and assignment."""
    emit_stress_test_triggered(socketio)
    
    scenarios = [
        {"type": "fire",     "location": "Room 302", "vip_present": True},
        {"type": "medical",  "location": "Room 105", "vip_present": False},
        {"type": "security", "location": "Main Lobby", "vip_present": False}
    ]
    
    # 1. Pre-analyze all scenarios to determine priority
    analyzed_scenarios = []
    for s in scenarios:
        active_list = [i.to_dict() for i in Incident.query.filter_by(status="active").all()]
        decision = decision_engine.analyze(s["type"], s["location"], s["vip_present"], active_incidents=active_list)
        analyzed_scenarios.append({"spec": s, "decision": decision})
    
    # 2. Sort by priority score (highest first)
    analyzed_scenarios.sort(key=lambda x: x["decision"]["priority_score"], reverse=True)
    
    results = []
    # 3. Create and assign in priority order
    for item in analyzed_scenarios:
        s = item["spec"]
        decision = item["decision"]
        
        incident = Incident(
            type=s["type"],
            location=s["location"],
            floor=decision["floor"],
            severity=decision["severity"],
            priority_score=decision["priority_score"],
            explanation=decision["explanation"] + " -> [STRESS TEST] Prioritized based on severity.",
            affected_zones=",".join(decision["affected_zones"]),
            recommended_actions="|".join(decision["recommended_actions"]),
            vip_present=s["vip_present"],
            time_to_critical=decision["time_to_critical"],
            impact_score=decision["impact_score"],
            evacuation_path="|".join([f"{p['floor']},{p['room']}" for p in decision["evacuation_path"]]),
            status="active"
        )
        db.session.add(incident)
        db.session.flush()
        
        # Assignment Engine will use current staff availability
        tasks = assignment_engine.assign(incident, decision)
        for task in tasks: db.session.add(task)
        db.session.commit()
        
        inc_dict = incident.to_dict()
        emit_new_incident(socketio, inc_dict)
        emit_evacuation_path_updated(socketio, incident.id, decision["evacuation_path"])
        emit_impact_score_calculated(socketio, incident.id, decision["impact_score"])
        for t in tasks: emit_task_assigned(socketio, t.to_dict(), inc_dict)
        results.append(inc_dict)
        
    return jsonify({"message": "Stress test initiated with priority sorting", "incidents": results})

def start_countdown_timer():
    import threading
    import time
    def countdown():
        while True:
            try:
                with app.app_context():
                    active_incidents = Incident.query.filter_by(status='active').all()
                    for inc in active_incidents:
                        if inc.time_to_critical > 0:
                            inc.time_to_critical -= 5
                            if inc.time_to_critical < 0: inc.time_to_critical = 0
                            db.session.commit()
                            emit_time_to_critical_updated(socketio, inc.id, inc.time_to_critical)
            except Exception as e:
                print(f"[TIMER] Error: {e}")
            time.sleep(5)
    
    thread = threading.Thread(target=countdown, daemon=True)
    thread.start()

start_countdown_timer()


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=True, allow_unsafe_werkzeug=True)
