import "server-only";

import { createTransport } from "nodemailer";

import { env, isDevelopment, isMailConfigured } from "@/config/env";
import { publicEnv } from "@/config/public-env";
import { inactivityDeactivateLabel } from "@/constants/security";
import { logger } from "@/lib/logger";

/**
 * Outbound mail. Password-reset, welcome, and inactivity deactivation share one
 * transport.
 *
 * When SMTP is unset, development logs the payload so local testing does not
 * need a mailbox. Production never logs secrets: a reset URL is a capability.
 */

export type MailDelivery = "delivered" | "logged" | "failed";

export interface PasswordResetMail {
  readonly to: string;
  readonly resetUrl: string;
}

export interface AccountDeactivatedMail {
  readonly to: string;
  readonly recipientName: string;
  readonly inactiveDays: number;
  readonly organizationName: string;
}

export interface AccountWelcomeMail {
  readonly to: string;
  readonly recipientName: string;
  readonly temporaryPassword: string;
  readonly loginUrl: string;
}

interface OutboundMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly kind: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function smtpTransport() {
  const port = env.SMTP_PORT ?? 587;

  return createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });
}

function isBrevoApiKey(value: string | undefined): value is string {
  return Boolean(value?.startsWith("xkeysib-"));
}

function parseSender(from: string): { readonly name?: string; readonly email: string } {
  const match = from.match(/^(.*)<([^>]+)>\s*$/);
  if (!match) {
    return { email: from.trim() };
  }

  const name = match[1]?.trim().replace(/^"|"$/g, "");
  const email = match[2]?.trim() ?? from.trim();
  return name ? { name, email } : { email };
}

function logDevelopmentMail(mail: OutboundMail): void {
  const lines = [
    "",
    `========== ${mail.kind} (SMTP not configured) ==========`,
    `To: ${mail.to}`,
    `Subject: ${mail.subject}`,
    "",
    mail.text,
    mail.html ? "\n--- HTML version included ---\n" : "",
    "=======================================================",
    "",
  ];
  console.warn(lines.join("\n"));
}

async function sendTextEmail(mail: OutboundMail): Promise<MailDelivery> {
  if (!isMailConfigured) {
    if (isDevelopment) {
      logDevelopmentMail(mail);
      logger.info(`${mail.kind} logged to console because SMTP is not configured`, {
        to: mail.to,
      });
      return "logged";
    }

    logger.error(`${mail.kind} skipped because SMTP is not configured`, { to: mail.to });
    return "failed";
  }

  try {
    const brevoApiKey = env.SMTP_PASSWORD;
    if (isBrevoApiKey(brevoApiKey)) {
      const sender = parseSender(env.SMTP_FROM ?? "");
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: sender.name ? { name: sender.name, email: sender.email } : { email: sender.email },
          to: [{ email: mail.to }],
          subject: mail.subject,
          textContent: mail.text,
          ...(mail.html ? { htmlContent: mail.html } : {}),
        }),
      });

      if (!response.ok) {
        logger.error(`${mail.kind} failed`, {
          to: mail.to,
          status: response.status,
          body: await response.text(),
        });
        return "failed";
      }

      return "delivered";
    }

    await smtpTransport().sendMail({
      from: env.SMTP_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
    });
    return "delivered";
  } catch (error) {
    logger.error(`${mail.kind} failed`, { to: mail.to, error });
    return "failed";
  }
}

function deliveredOrLogged(delivery: MailDelivery): boolean {
  return delivery === "delivered" || delivery === "logged";
}

function buildAccountWelcomeHtml(input: {
  readonly appName: string;
  readonly recipientName: string;
  readonly email: string;
  readonly temporaryPassword: string;
  readonly loginUrl: string;
}): string {
  const appName = escapeHtml(input.appName);
  const recipientName = escapeHtml(input.recipientName);
  const email = escapeHtml(input.email);
  const temporaryPassword = escapeHtml(input.temporaryPassword);
  const loginUrl = escapeHtml(input.loginUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName} account created</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f766e;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:0.02em;color:#ffffff;">${appName}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#ccfbf1;">Account created</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Hello ${recipientName},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                Your user account has been successfully created for <strong>${appName}</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Account details</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Email</p>
                    <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;">${email}</p>
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">Temporary password</p>
                    <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.04em;color:#0f172a;font-family:Consolas,Monaco,monospace;">${temporaryPassword}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px;background:#0f766e;">
                    <a href="${loginUrl}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Login to ${appName}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563;">
                For security purposes, you will be required to change your temporary password when you sign in for the first time.
              </p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#4b5563;">
                The temporary password will expire within <strong>24 hours</strong>. If you are unable to sign in after it expires, please contact your system administrator.
              </p>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4b5563;">
                If you did not expect this account, please contact your system administrator immediately.
              </p>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">
                Regards,<br />
                <strong>${appName} Administration</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                This is an automated message from ${appName}. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(mail: PasswordResetMail): Promise<boolean> {
  const subject = `${publicEnv.NEXT_PUBLIC_APP_NAME} password reset`;
  const text = [
    "A password reset was requested for your account.",
    "",
    "Open this link to choose a new password. It expires soon and can be used only once:",
    mail.resetUrl,
    "",
    "If you did not request this, you can ignore the message. Your password stays the same.",
  ].join("\n");

  return deliveredOrLogged(
    await sendTextEmail({
      to: mail.to,
      subject,
      text,
      kind: "Password reset mail",
    }),
  );
}

export async function sendAccountDeactivatedEmail(mail: AccountDeactivatedMail): Promise<boolean> {
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const period = inactivityDeactivateLabel(mail.inactiveDays);
  const greeting = mail.recipientName.trim() ? `Hello ${mail.recipientName.trim()},` : "Hello,";
  const text = [
    greeting,
    "",
    `Your ${appName} account at ${mail.organizationName} has been deactivated because there was no sign-in for ${period}.`,
    "",
    "Contact your administrator if you still need access.",
  ].join("\n");

  return deliveredOrLogged(
    await sendTextEmail({
      to: mail.to,
      subject: `${appName} account deactivated`,
      text,
      kind: "Account deactivated mail",
    }),
  );
}

export async function sendAccountWelcomeEmail(mail: AccountWelcomeMail): Promise<MailDelivery> {
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const recipientName = mail.recipientName.trim() || "there";
  const text = [
    appName,
    "────────────────────────────",
    "",
    `Hello ${recipientName},`,
    "",
    `Your user account has been successfully created for ${appName}.`,
    "",
    "Account Details",
    "",
    `Email: ${mail.to}`,
    `Temporary Password: ${mail.temporaryPassword}`,
    "",
    `Login to ${appName}:`,
    mail.loginUrl,
    "",
    "For security purposes, you will be required to change your temporary password when you sign in for the first time.",
    "",
    "The temporary password will expire within 24 hours. If you are unable to sign in after it expires, please contact your system administrator.",
    "",
    "If you did not expect this account, please contact your system administrator immediately.",
    "",
    "Regards,",
    `${appName} Administration`,
  ].join("\n");

  const html = buildAccountWelcomeHtml({
    appName,
    recipientName,
    email: mail.to,
    temporaryPassword: mail.temporaryPassword,
    loginUrl: mail.loginUrl,
  });

  return sendTextEmail({
    to: mail.to,
    subject: `${appName} — account created`,
    text,
    html,
    kind: "Account welcome mail",
  });
}

export interface TwoFactorOtpMail {
  readonly to: string;
  readonly code: string;
  readonly purpose: "sign-in" | "enrolment" | "disable";
}

export async function sendTwoFactorOtpEmail(mail: TwoFactorOtpMail): Promise<boolean> {
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const intro =
    mail.purpose === "sign-in"
      ? "Use this code to finish signing in:"
      : mail.purpose === "enrolment"
        ? "Use this code to turn on email one-time passwords:"
        : "Use this code to confirm turning off a sign-in method:";

  const text = [
    intro,
    "",
    mail.code,
    "",
    "The code expires in 10 minutes and can be used only once.",
    "",
    "If you did not request this, change your password and contact your administrator.",
  ].join("\n");

  return deliveredOrLogged(
    await sendTextEmail({
      to: mail.to,
      subject: `${appName} verification code`,
      text,
      kind: "Two-factor OTP mail",
    }),
  );
}
