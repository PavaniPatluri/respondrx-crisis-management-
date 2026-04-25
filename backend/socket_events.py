"""
Socket Events — SocketIO broadcast helpers.
All real-time notifications flow through here.
"""


def emit_new_incident(socketio, incident: dict):
    payload = {
        "event": "new_incident",
        "incident": incident,
        "message": f"🚨 NEW INCIDENT: {incident['type'].upper()} at {incident['location']} — Severity: {incident['severity'].upper()}",
    }
    socketio.emit("new_incident", payload, to="admin")
    socketio.emit("new_incident", payload, to="manager")


def emit_task_assigned(socketio, task: dict, incident: dict):
    payload = {
        "event": "task_assigned",
        "task": task,
        "incident_id": incident["id"],
        "message": f"📋 Task assigned to {task['staff_name']} ({task['role']}) → {task['description'][:60]}...",
    }
    socketio.emit("task_assigned", payload, to="admin")
    socketio.emit("task_assigned", payload, to="manager")
    socketio.emit("task_assigned", payload, to="staff")


def emit_task_updated(socketio, task: dict):
    status_icons = { "pending": "⏳", "in_progress": "🔄", "completed": "✅", "delayed": "⚠️", "failed": "❌" }
    icon = status_icons.get(task["status"], "📌")
    payload = {
        "event": "task_updated",
        "task": task,
        "message": f"{icon} Task #{task['id']} → {task['status'].upper()} (Staff: {task['staff_name']})",
    }
    socketio.emit("task_updated", payload, to="admin")
    socketio.emit("task_updated", payload, to="manager")
    socketio.emit("task_updated", payload, to="staff")


def emit_incident_resolved(socketio, incident: dict, analytics: dict):
    payload = {
        "event": "incident_resolved",
        "incident": incident,
        "analytics": analytics,
        "message": f"✅ INCIDENT #{incident['id']} RESOLVED — Response time: {analytics.get('total_response_time', 0)}s",
    }
    socketio.emit("incident_resolved", payload, to="admin")
    socketio.emit("incident_resolved", payload, to="manager")


def emit_iot_alert(socketio, sensor: str, value: float, location: str):
    payload = {
        "event": "iot_alert",
        "sensor": sensor,
        "value": value,
        "location": location,
        "message": f"🌡️  IoT ALERT: {sensor.upper()} reading {value} at {location}",
    }
    socketio.emit("iot_alert", payload, to="admin")
    socketio.emit("iot_alert", payload, to="manager")

def emit_decision_explained(socketio, incident_id: int, explanation: str):
    payload = {
        "event": "decision_explained",
        "incident_id": incident_id,
        "explanation": explanation,
        "message": f"🧠 XAI: Reasoning updated for Incident #{incident_id}."
    }
    socketio.emit("decision_explained", payload, to="admin")
    socketio.emit("decision_explained", payload, to="manager")

def emit_reassignment_triggered(socketio, old_task_id: int, new_task: dict):
    payload = {
        "event": "reassignment_triggered",
        "old_task_id": old_task_id,
        "new_task": new_task,
        "message": f"🔄 ADAPTIVE: Task #{old_task_id} failed. Auto-reassigned to {new_task.get('staff_name')}."
    }
    socketio.emit("reassignment_triggered", payload, to="admin")
    socketio.emit("reassignment_triggered", payload, to="manager")
    socketio.emit("reassignment_triggered", payload, to="staff")

def emit_risk_alert_generated(socketio, message: str):
    payload = {
        "event": "risk_alert_generated",
        "message": f"⚠️ PREDICTIVE RISK: {message}"
    }
    socketio.emit("risk_alert_generated", payload, to="admin")
    socketio.emit("risk_alert_generated", payload, to="manager")

def emit_escalation_triggered(socketio, task_id: int, reason: str):
    payload = {
        "event": "escalation_triggered",
        "task_id": task_id,
        "message": f"📈 ESCALATION: Task #{task_id} - {reason}"
    }
    socketio.emit("escalation_triggered", payload, to="admin")
    socketio.emit("escalation_triggered", payload, to="manager")

def emit_failure_triggered(socketio, incident_id: int, failure_type: str, message: str):
    payload = {
        "event": "failure_triggered",
        "incident_id": incident_id,
        "failure_type": failure_type,
        "message": f"💥 FAILURE INJECTED: {message}"
    }
    socketio.emit("failure_triggered", payload, to="admin")
    socketio.emit("failure_triggered", payload, to="manager")

def emit_replay_started(socketio, incident_id: int):
    payload = {
        "event": "replay_started",
        "incident_id": incident_id,
        "message": f"🔄 REPLAY MODE: Timelines engaged for Incident #{incident_id}"
    }
    socketio.emit("replay_started", payload, to="admin")
    socketio.emit("replay_started", payload, to="manager")

def emit_stress_test_triggered(socketio):
    payload = {
        "event": "stress_test_triggered",
        "message": "🧪 STRESS TEST: Simultaneous multi-incident scenario initiated."
    }
    socketio.emit("stress_test_triggered", payload, to="admin")
    socketio.emit("stress_test_triggered", payload, to="manager")

def emit_time_to_critical_updated(socketio, incident_id: int, time_left: int):
    payload = {
        "event": "time_to_critical_updated",
        "incident_id": incident_id,
        "time_left": time_left,
        "message": f"⏳ ALERT: Incident #{incident_id} escalating. Failure predicted in {time_left}s."
    }
    socketio.emit("time_to_critical_updated", payload, to="admin")
    socketio.emit("time_to_critical_updated", payload, to="manager")

def emit_evacuation_path_updated(socketio, incident_id: int, path: list):
    payload = {
        "event": "evacuation_path_updated",
        "incident_id": incident_id,
        "path": path,
        "message": f"🧭 NAVIGATION: New evacuation path calculated for Incident #{incident_id}."
    }
    socketio.emit("evacuation_path_updated", payload, to="admin")
    socketio.emit("evacuation_path_updated", payload, to="manager")

def emit_impact_score_calculated(socketio, incident_id: int, score: int):
    payload = {
        "event": "impact_score_calculated",
        "incident_id": incident_id,
        "score": score,
        "message": f"🧠 ANALYSIS: Incident #{incident_id} impact score updated: {score}/100."
    }
    socketio.emit("impact_score_calculated", payload, to="admin")
    socketio.emit("impact_score_calculated", payload, to="manager")

def emit_broadcast_voice_alert(socketio, admin_msg: str, staff_msg: str, incident_id: int):
    # Admin/Manager get detailed message
    socketio.emit("broadcast_voice_alert", {
        "event": "broadcast_voice_alert",
        "message": admin_msg,
        "incident_id": incident_id,
        "role": "admin"
    }, to="admin")
    socketio.emit("broadcast_voice_alert", {
        "event": "broadcast_voice_alert",
        "message": admin_msg,
        "incident_id": incident_id,
        "role": "admin"
    }, to="manager")
    
    # Staff get concise message
    socketio.emit("broadcast_voice_alert", {
        "event": "broadcast_voice_alert",
        "message": staff_msg,
        "incident_id": incident_id,
        "role": "staff"
    }, to="staff")

