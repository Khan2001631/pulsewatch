"""
Email Service.

Encapsulates all email sending functionality, currently using the Resend API.
Provides a clean interface for other parts of the application to send notifications
without needing to understand the underlying delivery mechanism.
"""

import logging
import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service class for sending emails.

    Sender note:
        Resend requires the "from" domain to be verified in your Resend account.
        During development, use the shared Resend address below (works on all accounts
        without domain verification).  Once you have a verified domain, update
        DEFAULT_SENDER to e.g. "PulseWatch <noreply@yourdomain.com>".
    """

    # Resend's shared testing address — works on every account without domain verification.
    # Replace with your verified domain address before going to production.
    DEFAULT_SENDER = "onboarding@resend.dev"

    @classmethod
    def send_password_reset_email(cls, to_email: str, reset_link: str) -> bool:
        """
        Send a password reset email to the specified user.

        Args:
            to_email:   The user's email address.
            reset_link: The full URL to the frontend reset password page,
                        including the secure token parameter.

        Returns:
            True if the email was successfully sent (or queued), False otherwise.
        """
        # Always re-read the key from settings so hot-reloads pick up .env changes.
        api_key = settings.resend_api_key
        if not api_key:
            logger.warning("RESEND_API_KEY is not configured. Email will not be sent.")
            logger.info(f"Password reset link generated for {to_email}: {reset_link}")
            return False

        resend.api_key = api_key

        subject = "Reset your PulseWatch Password"

        # We use a simple HTML template. A more robust implementation might use
        # Jinja2 templates, but this is sufficient for a single link.
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password for your PulseWatch account.</p>
                <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                        Reset Password
                    </a>
                </p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>Best regards,<br>The PulseWatch Team</p>
                <hr style="border: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 12px; color: #999;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    {reset_link}
                </p>
            </div>
        </body>
        </html>
        """

        params: resend.Emails.SendParams = {
            "from": cls.DEFAULT_SENDER,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }

        try:
            result = resend.Emails.send(params)
            logger.info(f"Successfully sent password reset email to {to_email}. Resend ID: {result.get('id')}")
            return True
        except Exception as e:
            logger.error(
                f"Failed to send password reset email to {to_email}. "
                f"Resend error: {type(e).__name__}: {e}"
            )
            return False
