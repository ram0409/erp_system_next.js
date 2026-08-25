import "server-only";

import { createTransport } from "nodemailer";

import { env, isDevelopment, isMailConfigured } from "@/config/env";
import { publicEnv } from "@/config/public-env";
import { logger } from "@/lib/logger";

/**
 * Outbound mail. Password-reset is the only sender today; the helper stays
 * generic so a later notification does not grow a second transport.
 *
 * When SMTP is unset, development logs the reset URL so local testing does not
 * need a mailbox. Production never logs the URL: the token is a capability.
 */

export interface PasswordResetMail {
  readonly to: string;
  readonly resetUrl: string;
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

  if (!isMailConfigured) {
    if (isDevelopment) {
      logger.info("Password reset link (SMTP is not configured)", {
        to: mail.to,
        resetUrl: mail.resetUrl,
      });
      return true;
    }

    logger.error("Password reset mail skipped because SMTP is not configured", { to: mail.to });
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
          subject,
          textContent: text,
        }),
      });

      if (!response.ok) {
        logger.error("Password reset mail failed", {
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
      subject,
      text,
    });
    return true;
  } catch (error) {
    logger.error("Password reset mail failed", { to: mail.to, error });
    return false;
  }
}
