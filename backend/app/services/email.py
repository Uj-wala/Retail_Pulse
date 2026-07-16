import logging
import smtplib
from email.message import EmailMessage

from ..config import get_settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    settings = get_settings()

    if not settings.email_configured:
        logger.warning("SMTP is not configured; skipping email to %s (subject: %s)", to_email, subject)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


def send_password_reset_email(to_email: str, reset_link: str, expires_in_minutes: int) -> None:
    subject = "Reset your RetailPulse password"
    text_body = (
        "We received a request to reset your RetailPulse password.\n\n"
        f"Reset your password using this link: {reset_link}\n\n"
        f"This link expires in {expires_in_minutes} minutes. "
        "If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0f766e;">Reset your password</h2>
      <p>We received a request to reset your RetailPulse password.</p>
      <p>
        <a href="{reset_link}"
           style="display:inline-block; padding:10px 20px; background:#0f766e; color:#fff;
                  border-radius:8px; text-decoration:none; font-weight:bold;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">{reset_link}</p>
      <p>This link expires in {expires_in_minutes} minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    send_email(to_email, subject, html_body, text_body)
