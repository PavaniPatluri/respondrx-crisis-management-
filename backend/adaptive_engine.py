"""
Adaptive Engine — Handles real-time response adjustments, task escalations,
and autonomous reassignment if staff fail to respond.
"""

from datetime import datetime, timedelta
from models import db, Task, Staff, EventLog
from assignment_engine import AssignmentEngine
import json

class AdaptiveEngine:
    def __init__(self, socketio):
        self.socketio = socketio
        self.assignment_engine = AssignmentEngine()

    def check_for_delays(self, app):
        """
        Periodically called (or triggered) to find tasks exceeding expected duration.
        In a real system, this would be a background thread/celery task.
        For the demo, we trigger this on specific events.
        """
        with app.app_context():
            # Find in-progress tasks that have exceeded their expected duration
            active_tasks = Task.query.filter(Task.status.in_(['pending', 'in_progress'])).all()
            now = datetime.utcnow()
            
            for task in active_tasks:
                elapsed = (now - task.created_at).total_seconds()
                if elapsed > task.expected_duration_seconds and task.status != 'delayed':
                    self.escalate_task(task, f"Task delay detected: {int(elapsed)}s elapsed (Expected: {task.expected_duration_seconds}s)")

    def escalate_task(self, task, reason):
        """Marks a task as delayed and notifies management."""
        task.status = 'delayed'
        db.session.commit()
        
        # Log event
        log = EventLog(
            incident_id=task.incident_id,
            event_type="TASK_DELAYED",
            description=f"Escalation: {reason}",
            metadata_json=json.dumps({"task_id": task.id, "staff_id": task.assigned_staff_id})
        )
        db.session.add(log)
        db.session.commit()
        
        # Notify via SocketIO
        from socket_events import emit_escalation_triggered
        emit_escalation_triggered(self.socketio, task.id, reason)
        self.socketio.emit('task_escalated', {
            'task_id': task.id,
            'incident_id': task.incident_id,
            'message': f"⚠️ ESCALATION: {reason}",
            'severity': 'high'
        })

    def handle_staff_failure(self, staff_id, incident_id):
        """
        Triggered if a staff member becomes unavailable (e.g. simulated heart rate drop or manual flag).
        Autonomously reassigns their active tasks for a specific incident.
        """
        # Find the active task for this staff in this incident
        task = Task.query.filter_by(
            assigned_staff_id=staff_id, 
            incident_id=incident_id
        ).filter(Task.status != 'completed').first()
        
        if not task:
            return None

        # Log failure
        staff = Staff.query.get(staff_id)
        log = EventLog(
            incident_id=incident_id,
            event_type="STAFF_FAILURE",
            description=f"System detected failure for {staff.name}. Initiating adaptive reassignment.",
            metadata_json=json.dumps({"staff_id": staff_id, "role": task.role})
        )
        db.session.add(log)
        
        # Trigger reassignment
        from models import Incident
        incident = Incident.query.get(incident_id)
        
        # Find new candidate via AssignmentEngine
        # We temporarily mark the failed staff as available=False (already is) 
        # but the engine will filter them because they are assigned.
        # Wait, the engine filters for available=True. The failed staff is already available=False.
        
        # Create a mock decision dict for the assignment engine
        decision = {
            "floor": incident.floor,
            "required_roles": [task.role]
        }
        
        new_tasks = self.assignment_engine.assign(incident, decision)
        if new_tasks and new_tasks[0].assigned_staff_id:
            new_task = new_tasks[0]
            # Transfer details from old task to new one
            new_task.description = f"[REASSIGNED] {task.description}"
            
            # Close old task as failed
            task.status = 'failed'
            task.completed_at = datetime.utcnow()
            
            db.session.add(new_task)
            db.session.commit()
            
            # Log success
            new_staff = Staff.query.get(new_task.assigned_staff_id)
            reassignment_log = EventLog(
                incident_id=incident_id,
                event_type="REASSIGNMENT_SUCCESS",
                description=f"Task successfully reassigned to {new_staff.name}.",
            )
            db.session.add(reassignment_log)
            db.session.commit()
            
            from socket_events import emit_reassignment_triggered
            emit_reassignment_triggered(self.socketio, task.id, new_task.to_dict())
            
            return new_task
        
        return None
