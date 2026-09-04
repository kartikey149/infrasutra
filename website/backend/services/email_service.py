import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

# Configure standard logger for email service
logger = logging.getLogger("email_service")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

EMAIL_HOST = os.getenv("EMAIL_HOST", "").strip()
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "").strip()
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@oilindia.in").strip()
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "true").lower() in ("true", "1", "yes")
APP_URL = os.getenv("APP_URL", "http://localhost:5173").rstrip("/")

def send_supervisor_assignment_email(
    supervisor_name: str,
    supervisor_email: Optional[str],
    project_name: str,
    project_id: str,
    assigned_by_name: str = "Project Planner",
    is_reassignment: bool = False
) -> Dict[str, Any]:
    """
    Send an email notification to the assigned supervisor.
    
    GUARANTEES:
    1. Returns a dictionary status: {"status": "sent" | "simulated" | "skipped" | "failed", ...}
    2. NEVER raises an unhandled exception to the caller.
    3. If email delivery fails, the failure is logged and the project assignment remains intact.
    4. If the supervisor has no email, it is logged and gracefully skipped.
    """
    if not supervisor_email or "@" not in supervisor_email or "." not in supervisor_email:
        logger.warning(
            f"[EMAIL SERVICE] Supervisor '{supervisor_name}' has no valid email address ({supervisor_email}). Skipping email notification."
        )
        return {"status": "skipped", "reason": "Supervisor does not have a valid email address."}

    action_text = "reassigned to" if is_reassignment else "assigned to"
    subject = f"You have been {action_text} Project {project_name}"

    login_url = f"{APP_URL}/login"
    body_text = f"""Hello {supervisor_name},

You have been {action_text} the following project in the Oil India InfraSutra Project Management System:

Project Name: {project_name}
Project Code: {project_id}
Assigned By:  {assigned_by_name}

Please log in to the application to view your assigned scope, track activities, and submit voice/field updates:
{login_url}

Regards,
Project Management System
Oil India Limited
"""

    body_html = f"""
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f59e0b, #4f46e5); padding: 20px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">Oil India Limited &bull; InfraSutra</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Project Supervision & Execution Tracking</p>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 15px; font-weight: bold;">Hello {supervisor_name},</p>
            <p>You have been <strong>{action_text}</strong> the following project in the system:</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0 0 6px 0;"><strong>Project Name:</strong> {project_name}</p>
                <p style="margin: 0 0 6px 0;"><strong>Project Code:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">{project_id}</code></p>
                <p style="margin: 0;"><strong>Assigned By:</strong> {assigned_by_name}</p>
            </div>
            <p>Please log in to the web application to view your assigned WBS schedule, safety parameters, and start reporting field progress via text or voice logs.</p>
            <div style="margin: 24px 0; text-align: center;">
                <a href="{login_url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 8px; display: inline-block;">
                    Access Project Workspace &rarr;
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; margin: 0;">
                Regards,<br />
                <strong>Project Management System</strong><br />
                Oil India Limited
            </p>
        </div>
    </div>
    """

    # If no SMTP server configured, simulate and log without crashing
    if not EMAIL_HOST:
        logger.info(
            f"[EMAIL SERVICE MOCK] SMTP not configured (EMAIL_HOST is empty). Simulated assignment email successfully generated for {supervisor_email}:\n"
            f"Subject: {subject}\n"
            f"Recipient: {supervisor_name} <{supervisor_email}>"
        )
        return {
            "status": "simulated",
            "recipient": supervisor_email,
            "subject": subject,
            "message": "Email notification simulated successfully (mock mode)."
        }

    # Attempt real SMTP transmission
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = supervisor_email

        part1 = MIMEText(body_text, "plain")
        part2 = MIMEText(body_html, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)
        if EMAIL_USE_TLS:
            server.starttls()
        if EMAIL_USER and EMAIL_PASSWORD:
            server.login(EMAIL_USER, EMAIL_PASSWORD)

        server.send_message(msg)
        server.quit()

        logger.info(f"[EMAIL SERVICE SUCCESS] Assignment email successfully delivered to {supervisor_email} for project {project_id}.")
        return {"status": "sent", "recipient": supervisor_email}

    except Exception as e:
        logger.error(
            f"[EMAIL SERVICE WARNING] Failed to send email to {supervisor_email} for project {project_id}: {str(e)}. "
            f"Project assignment remains valid and unaffected."
        )
        return {"status": "failed", "recipient": supervisor_email, "error": str(e)}
