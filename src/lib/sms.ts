import "server-only";

import { env, isDevelopment, isSmsConfigured } from "@/config/env";
import { logger } from "@/lib/logger";
import { maskPhone, toE164Phone } from "@/lib/phone";

export type SmsDelivery = "delivered" | "logged" | "failed";

export interface TwoFactorOtpSms {
  readonly to: string;
  readonly code: string;
  readonly purpose: "sign-in" | "enrolment" | "disable";
}

export { maskPhone, toE164Phone };

/**
 * SMSGatewayHub expects a 10-digit Indian mobile (same as PHP User_Auth).
 */
function toSmsGatewayNumber(phone: string): string | null {
  const e164 = toE164Phone(phone);
  if (!e164) {
    return null;
  }

  const digits = e164.replace(/\D/g, "");
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return null;
}

/**
 * Matches PHP `date("j M Y g:i a.")` used in User_Auth OTP SMS.
 * Example: `16 Sep 2026 6:44 pm.`
 */
function formatOtpDatedStamp(from: Date = new Date()): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ] as const;

  const day = from.getDate();
  const month = months[from.getMonth()]!;
  const year = from.getFullYear();
  const minutes = from.getMinutes().toString().padStart(2, "0");
  const ampm = from.getHours() >= 12 ? "pm" : "am";
  let hours = from.getHours() % 12;
  if (hours === 0) {
    hours = 12;
  }

  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}.`;
}

/**
 * Exact DLT / PHP template from User_Auth.php:
 * `For GMH login, your OTP is {code}. Dated {j M Y g:i a.} -GoldenMarineHarvest`
 */
function buildGmhLoginOtpMessage(code: string, at: Date = new Date()): string {
  return `For GMH login, your OTP is ${code}. Dated ${formatOtpDatedStamp(at)} -GoldenMarineHarvest`;
}

function normalizeSmsNewlines(message: string): string {
  return message.replace(/\r\n|\r|\n/g, "\r\n");
}

function smsDataCodingScheme(message: string): 0 | 8 {
  // DCS 8 for Unicode (e.g. en dash in approved DLT templates); ASCII stays on DCS 0.
  return /[^\u0000-\u007F]/.test(message) ? 8 : 0;
}

interface SmsGatewayHubResponse {
  readonly ErrorCode?: string;
  readonly ErrorMessage?: string;
  readonly MessageData?: unknown;
}

/**
 * Same flow as PHP `httpCurl::smsgateway` → SMSGatewayHub SendSMS.
 */
async function sendViaSmsGatewayHub(
  to10Digit: string,
  smsMessage: string,
  templateId = "",
): Promise<boolean> {
  const normalized = normalizeSmsNewlines(smsMessage);
  const dcs = smsDataCodingScheme(normalized);

  const params = new URLSearchParams({
    APIKey: env.SMS_GATEWAY_API_KEY!,
    senderid: env.SMS_GATEWAY_SENDER_ID,
    channel: String(env.SMS_GATEWAY_CHANNEL),
    DCS: String(dcs),
    flashsms: "0",
    number: to10Digit,
    text: normalized,
    route: String(env.SMS_GATEWAY_ROUTE),
  });

  const configuredTemplateId = templateId || env.SMS_GATEWAY_DLT_TEMPLATE_ID?.trim() || "";
  if (configuredTemplateId) {
    params.set("dlttemplateid", configuredTemplateId);
    params.set("tid", configuredTemplateId);
  }

  const url = `${env.SMS_GATEWAY_BASE_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      body: "",
      cache: "no-store",
    });

    const raw = await response.text();
    let parsed: SmsGatewayHubResponse | null = null;
    try {
      parsed = JSON.parse(raw) as SmsGatewayHubResponse;
    } catch {
      parsed = null;
    }

    const success = parsed?.ErrorCode === "000";

    if (!success) {
      logger.error("SMSGatewayHub SMS send failed", {
        to: maskPhone(to10Digit),
        httpStatus: response.status,
        errorCode: parsed?.ErrorCode,
        errorMessage: parsed?.ErrorMessage,
        dcs,
        templateId: configuredTemplateId || undefined,
      });
      return false;
    }

    logger.info("SMSGatewayHub SMS send ok", {
      to: maskPhone(to10Digit),
      dcs,
      templateId: configuredTemplateId || undefined,
    });
    return true;
  } catch (error) {
    logger.error("SMSGatewayHub SMS request failed", { error, to: maskPhone(to10Digit) });
    return false;
  }
}

/**
 * Sends a 2FA SMS via SMSGatewayHub (same gateway / template as PHP User_Auth).
 * Without API key in development, logs the code like mail does.
 */
export async function sendTwoFactorOtpSms(sms: TwoFactorOtpSms): Promise<boolean> {
  const to10 = toSmsGatewayNumber(sms.to);
  if (!to10 || !/^\d{10}$/.test(to10)) {
    logger.error("SMS OTP skipped because the phone number is invalid", { to: sms.to });
    return false;
  }

  // Same approved template text as PHP — do not alter wording for DLT compliance.
  const body = buildGmhLoginOtpMessage(sms.code);

  if (!isSmsConfigured) {
    if (isDevelopment) {
      logger.info("Two-factor OTP SMS logged to console because SMS gateway is not configured", {
        to: maskPhone(sms.to),
        code: sms.code,
        purpose: sms.purpose,
        body,
      });
      return true;
    }

    logger.error("Two-factor OTP SMS skipped because SMS gateway is not configured", {
      to: maskPhone(sms.to),
    });
    return false;
  }

  return sendViaSmsGatewayHub(to10, body);
}
