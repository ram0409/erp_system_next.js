import "server-only";

import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

import { env, isDevelopment, isSmsConfigured } from "@/config/env";
import { publicEnv } from "@/config/public-env";
import { TWO_FACTOR_CODE_TTL_MINUTES } from "@/constants/two-factor";
import { logger } from "@/lib/logger";

export type SmsDelivery = "delivered" | "logged" | "failed";

export interface TwoFactorOtpSms {
  readonly to: string;
  readonly code: string;
  readonly purpose: "sign-in" | "enrolment" | "disable";
}

/**
 * Normalizes a stored phone to E.164 for SNS.
 * 10-digit local numbers are treated as India (+91).
 */
export function toE164Phone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function maskPhone(phone: string): string {
  const e164 = toE164Phone(phone) ?? phone.replace(/\D/g, "");
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 4) {
    return "••••";
  }
  return `••••${digits.slice(-4)}`;
}

function purposePhrase(purpose: TwoFactorOtpSms["purpose"]): string {
  if (purpose === "sign-in") {
    return "login verification";
  }
  if (purpose === "enrolment") {
    return "SMS OTP setup";
  }
  return "sign-in method disable";
}

function createSnsClient(): SNSClient {
  return new SNSClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function sendSnsSms(toE164: string, body: string): Promise<boolean> {
  const messageAttributes: PublishCommand["input"]["MessageAttributes"] = {
    "AWS.SNS.SMS.SMSType": {
      DataType: "String",
      StringValue: "Transactional",
    },
  };

  const senderId = env.AWS_SNS_SENDER_ID?.trim();
  if (senderId) {
    messageAttributes["AWS.SNS.SMS.SenderID"] = {
      DataType: "String",
      StringValue: senderId,
    };
  }

  const client = createSnsClient();
  const result = await client.send(
    new PublishCommand({
      PhoneNumber: toE164,
      Message: body,
      MessageAttributes: messageAttributes,
    }),
  );

  if (!result.MessageId) {
    logger.error("AWS SNS SMS send returned no MessageId", { to: maskPhone(toE164) });
    return false;
  }

  return true;
}

/**
 * Sends a 2FA SMS via AWS SNS. Without AWS credentials in development,
 * logs the code like mail does.
 */
export async function sendTwoFactorOtpSms(sms: TwoFactorOtpSms): Promise<boolean> {
  const toE164 = toE164Phone(sms.to);
  if (!toE164) {
    logger.error("SMS OTP skipped because the phone number is invalid", { to: sms.to });
    return false;
  }

  const appName = publicEnv.NEXT_PUBLIC_APP_NAME;
  const body = `${appName} ${purposePhrase(sms.purpose)} code is ${sms.code}. This code is valid for ${TWO_FACTOR_CODE_TTL_MINUTES} minute${TWO_FACTOR_CODE_TTL_MINUTES === 1 ? "" : "s"}.`;

  if (!isSmsConfigured) {
    if (isDevelopment) {
      logger.info("Two-factor OTP SMS logged to console because AWS SNS is not configured", {
        to: maskPhone(sms.to),
        code: sms.code,
        purpose: sms.purpose,
      });
      return true;
    }

    logger.error("Two-factor OTP SMS skipped because AWS SNS is not configured", {
      to: maskPhone(sms.to),
    });
    return false;
  }

  try {
    return await sendSnsSms(toE164, body);
  } catch (error) {
    logger.error("Two-factor OTP SMS failed", { error });
    return false;
  }
}
