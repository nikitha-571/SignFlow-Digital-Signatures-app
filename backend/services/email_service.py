import os
from typing import List, Optional
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
from dotenv import load_dotenv
from jose import jwt
import base64

load_dotenv()

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "smtp")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SignFlow")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")
SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME", "SignFlow")

BACKEND_NOTIFICATION_EMAIL = os.getenv("BACKEND_NOTIFICATION_EMAIL")
ENABLE_EMAIL_ROUTING = os.getenv("ENABLE_EMAIL_ROUTING", "false").lower() == "true"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
SIGNING_TOKEN_EXPIRE_HOURS = int(os.getenv("SIGNING_TOKEN_EXPIRE_HOURS", 72))


def get_actual_recipient(user_email: str) -> str:
    if ENABLE_EMAIL_ROUTING and BACKEND_NOTIFICATION_EMAIL:
        return BACKEND_NOTIFICATION_EMAIL
    return user_email


def generate_signing_token(document_id: int, signer_email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=SIGNING_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "document_id": document_id,
        "signer_email": signer_email,
        "exp": expire,
        "type": "signing_link"
    }
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_signing_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "signing_link":
            return None
        return payload
    except:
        return None


async def send_password_reset_email(user_email: str, user_name: str, reset_link: str):
    subject = "Reset Your SignFlow Password"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
            .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 32px;">🔐 Password Reset</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">SignFlow Digital Signatures</p>
            </div>

            <div class="content">
                <h2 style="color: #1f2937;">Hi {user_name},</h2>

                <p>We received a request to reset your password for your SignFlow account.</p>

                <p>Click the button below to choose a new password:</p>

                <div style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </div>

                <div class="warning">
                    <strong>⏰ This link expires in 1 hour</strong>
                </div>

                <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 13px;">
                    {reset_link}
                </p>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                <p style="color: #6b7280; font-size: 14px;">
                    <strong>Didn't request this?</strong><br>
                    If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
                </p>
            </div>

            <div class="footer">
                <p>© 2026 SignFlow. All rights reserved.</p>
                <p style="font-size: 12px; color: #9ca3af;">
                    This is an automated message, please do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content
    )


async def send_email_smtp(
        to_email: str,
        subject: str,
        html_content: str,
        attachment_path: Optional[str] = None
):
    try:
        message = MIMEMultipart("alternative")
        message["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())

            encoders.encode_base64(part)
            filename = os.path.basename(attachment_path)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {filename}",
            )
            message.attach(part)

        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USERNAME,
            password=SMTP_PASSWORD,
            start_tls=True,
        )

        print(f"✅ SMTP Email sent to: {to_email}")
        return True
    except Exception as e:
        print(f"❌ SMTP Email failed: {str(e)}")
        return False


async def send_email_sendgrid(
        to_email: str,
        subject: str,
        html_content: str,
        attachment_path: Optional[str] = None
):
    try:
        message = Mail(
            from_email=(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )

        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, 'rb') as f:
                file_data = f.read()
                encoded_file = base64.b64encode(file_data).decode()

            attachment = Attachment(
                FileContent(encoded_file),
                FileName(os.path.basename(attachment_path)),
                FileType('application/pdf'),
                Disposition('attachment')
            )
            message.attachment = attachment

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)

        print(f"✅ SendGrid Email sent to: {to_email} (Status: {response.status_code})")
        return True
    except Exception as e:
        print(f"❌ SendGrid Email failed: {str(e)}")
        return False


async def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        attachment_path: Optional[str] = None,
        original_user_email: Optional[str] = None
):
    actual_recipient = get_actual_recipient(to_email)

    if ENABLE_EMAIL_ROUTING and actual_recipient != to_email:
        routing_notice = f"""
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
            <strong>📧 Email Routing Active:</strong> This email was originally intended for <strong>{to_email}</strong>
            but has been routed to your backend notification email for testing/development.
        </div>
        """
        html_content = routing_notice + html_content

    if EMAIL_PROVIDER == "sendgrid" and SENDGRID_API_KEY:
        return await send_email_sendgrid(actual_recipient, subject, html_content, attachment_path)
    else:
        return await send_email_smtp(actual_recipient, subject, html_content, attachment_path)


async def send_signing_request_email(
        signer_email: str,
        signer_name: str,
        document_title: str,
        document_id: int,
        sender_name: str,
        custom_message: str = None
):
    token = generate_signing_token(document_id, signer_email)
    signing_url = f"{FRONTEND_URL}/sign/{token}"

    custom_message_html = ""
    if custom_message:
        custom_message_html = f"""
            <div class="info-box" style="background: #eff6ff; border-left: 4px solid #3b82f6;">
                <p style="font-weight: bold; color: #1e40af; margin-bottom: 8px;">📝 Message from {sender_name}:</p>
                <p style="color: #1e3a8a; white-space: pre-wrap;">{custom_message}</p>
            </div>
            """

    html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #059669 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .button:hover {{ background: #047857; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                .info-box {{ background: white; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✍️ SignFlow</h1>
                    <p>Document Signature Request</p>
                </div>
                <div class="content">
                    <h2>Hello {signer_name},</h2>
                    <p><strong>{sender_name}</strong> has requested your signature on the following document:</p>

                    <div class="info-box">
                        <h3>📄 {document_title}</h3>
                        <p><strong>Requested by:</strong> {sender_name}</p>
                        <p><strong>Intended for:</strong> {signer_email}</p>
                        <p><strong>Expires in:</strong> {SIGNING_TOKEN_EXPIRE_HOURS} hours</p>
                    </div>

                    {custom_message_html}

                    <p>Click the button below to review and sign the document:</p>

                    <div style="text-align: center;">
                        <a href="{signing_url}" class="button">
                            📝 Sign Document
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        <strong>Security Note:</strong> This link is unique and secure. It will expire in {SIGNING_TOKEN_EXPIRE_HOURS} hours.
                        If you did not expect this request, please ignore this email.
                    </p>

                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        Direct link: <a href="{signing_url}">{signing_url}</a>
                    </p>
                </div>
                <div class="footer">
                    <p>© 2026 SignFlow Digital Signatures. All rights reserved.</p>
                    <p>Secure document signing platform</p>
                </div>
            </div>
        </body>
        </html>
        """

    return await send_email(
        to_email=signer_email,
        subject=f"📝 Signature Request: {document_title}",
        html_content=html_content,
        original_user_email=signer_email
    )


async def send_document_signed_email(
        owner_email: str,
        owner_name: str,
        document_title: str,
        signer_name: str
):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .success-box {{ background: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Document Signed</h1>
            </div>
            <div class="content">
                <h2>Good news, {owner_name}!</h2>

                <div class="success-box">
                    <h3>📄 {document_title}</h3>
                    <p><strong>{signer_name}</strong> has signed your document.</p>
                    <p><strong>Signed at:</strong> {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</p>
                </div>

                <p>You can download the signed document from your SignFlow dashboard.</p>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="{FRONTEND_URL}/dashboard" style="display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        📥 View Dashboard
                    </a>
                </div>
            </div>
            <div class="footer">
                <p>© 2026 SignFlow Digital Signatures. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=owner_email,
        subject=f"✅ Document Signed: {document_title}",
        html_content=html_content,
        original_user_email=owner_email
    )

async def send_signer_download_email(
    to_email: str,
    to_name: str,
    document_title: str,
    download_url: str,
):

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #059669 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }}
        .success-box {{ background: #d1fae5; border-left: 4px solid #059669; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }}
        .notice {{ background: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 13px; color: #713f12; margin-top: 20px; }}
        .footer {{ text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }}
        .url-box {{ background: #f3f4f6; padding: 10px 14px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #374151; margin-top: 12px; }}
    </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0; font-size:28px;">✍️ PenSeal</h1>
            <p style="margin:8px 0 0; opacity:0.9;">Document Fully Signed</p>
        </div>
        <div class="content">
            <h2 style="color:#1e293b;">Hello {to_name},</h2>
            <p>Great news! The document below has been <strong>fully signed by all parties</strong>. Your copy of the signed PDF is ready to download.</p>

            <div class="success-box">
                <p style="margin:0; font-size:18px; font-weight:bold; color:#065f46;">📄 {document_title}</p>
                <p style="margin:8px 0 0; color:#047857;">✅ All signatures collected — document is complete</p>
            </div>

            <p>Click the button below to download your signed PDF. Keep it for your records.</p>

            <div style="text-align: center;">
                <a href="{download_url}" class="button">
                    📥 Download Signed PDF
                </a>
            </div>

            <div class="notice">
                ⚠️ <strong>Important:</strong> This download link uses your personal signing token and will expire after {SIGNING_TOKEN_EXPIRE_HOURS} hours. Download your copy before it expires.
            </div>

            <p style="color:#6b7280; font-size:13px; margin-top:20px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="url-box">{download_url}</div>
        </div>
        <div class="footer">
            <p>© 2026 PenSeal Digital Signatures. All rights reserved.</p>
            <p>Secure document signing platform</p>
        </div>
    </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=to_email,
        subject=f"📥 Your Signed Document is Ready: {document_title}",
        html_content=html_content,
        original_user_email=to_email,
    )

async def send_signed_pdf_email(
        to_email: str,
        to_name: str,
        document_title: str,
        pdf_path: str
):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #059669 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📎 Signed Document Attached</h1>
            </div>
            <div class="content">
                <h2>Hello {to_name},</h2>
                <p>Please find the signed document attached to this email:</p>
                <h3>📄 {document_title}</h3>
                <p>The document has been securely signed and is ready for your records.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Thank you for using SignFlow Digital Signatures.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=to_email,
        subject=f"📎 Signed Document: {document_title}",
        html_content=html_content,
        attachment_path=pdf_path,
        original_user_email=to_email
    )

async def send_document_rejected_email(
    owner_email: str,
    owner_name: str,
    document_title: str,
    signer_email: str,
    rejection_reason: str
):
    rejected_at = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    subject = f"❌ Document Rejected - {document_title}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .reason-box {{ background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }}
            .info-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }}
            .info-label {{ font-weight: bold; color: #6b7280; min-width: 140px; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 28px;">❌ Document Rejected</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">SignFlow Digital Signatures</p>
            </div>

            <div class="content">
                <h2 style="color: #1f2937;">Hi {owner_name},</h2>

                <p>Unfortunately, one of your signing requests has been rejected.</p>

                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <div class="info-row">
                        <span class="info-label">Document:</span>
                        <span>{document_title}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Rejected By:</span>
                        <span>{signer_email}</span>
                    </div>
                    <div class="info-row" style="border-bottom: none;">
                        <span class="info-label">Rejected At:</span>
                        <span>{rejected_at}</span>
                    </div>
                </div>

                <div class="reason-box">
                    <p style="margin: 0; font-weight: bold; color: #dc2626; margin-bottom: 8px;">
                        ❌ Rejection Reason:
                    </p>
                    <p style="margin: 0; color: #374151;">"{rejection_reason}"</p>
                </div>

                <p>You can review the document and re-send a signing request after making any necessary changes.</p>

                <div style="text-align: center;">
                    <a href="{FRONTEND_URL}/dashboard" class="button">
                        Go to Dashboard
                    </a>
                </div>
            </div>

            <div class="footer">
                <p>© 2026 SignFlow. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return await send_email(
        to_email=owner_email,
        subject=subject,
        html_content=html_content
    )
































