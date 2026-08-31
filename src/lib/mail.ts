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

interface TextMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly kind: string;
  readonly developmentExtra?: Record<string, unknown>;
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

async function sendTextEmail(mail: TextMail): Promise<boolean> {
  if (!isMailConfigured) {
    if (isDevelopment) {
      logger.info(`${mail.kind} (SMTP is not configured)`, {
        to: mail.to,
        ...mail.developmentExtra,
      });
      return true;
    }

    logger.error(`${mail.kind} skipped because SMTP is not configured`, { to: mail.to });
    return false;
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
        }),
      });

      if (!response.ok) {
        logger.error(`${mail.kind} failed`, {
          to: mail.to,
          status: response.status,
          body: await response.text(),
        });
        return false;
      }

      return true;
    }

    await smtpTransport().sendMail({
      from: env.SMTP_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    return true;
  } catch (error) {
    logger.error(`${mail.kind} failed`, { to: mail.to, error });
    return false;
  }
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

  return sendTextEmail({
    to: mail.to,
    subject,
    text,
    kind: "Password reset mail",
    developmentExtra: { resetUrl: mail.resetUrl },
  });
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

  return sendTextEmail({
    to: mail.to,
    subject: `${appName} account deactivated`,
    text,
    kind: "Account deactivated mail",
  });
}

export async function sendAccountWelcomeEmail(mail: AccountWelcomeMail): Promise<boolean> {
  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const greeting = mail.recipientName.trim() ? `Hello ${mail.recipientName.trim()},` : "Hello,";
  const text = [
    greeting,
    "",
    `An account was created for you on ${appName}.`,
    "",
    "Sign in here:",
    mail.loginUrl,
    "",
    `Email: ${mail.to}`,
    `Temporary password: ${mail.temporaryPassword}`,
    "",
    "You will be asked to choose a new password after you sign in.",
    "This temporary password expires in 1 day. After that you cannot sign in with it — contact your administrator.",
    "",
    "If you did not expect this message, contact your administrator.",
  ].join("\n");

  return sendTextEmail({
    to: mail.to,
    subject: `${appName} account created`,
    text,
    kind: "Account welcome mail",
    developmentExtra: { loginUrl: mail.loginUrl, temporaryPassword: mail.temporaryPassword },
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

  return sendTextEmail({
    to: mail.to,
    subject: `${appName} verification code`,
    text,
    kind: "Two-factor OTP mail",
    developmentExtra: { code: mail.code, purpose: mail.purpose },
  });
}
