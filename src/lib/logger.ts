import "server-only";

import { isProduction } from "@/config/env";
import { redactSensitive } from "@/lib/redact";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  readonly [key: string]: unknown;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context: redactSensitive(context) } : {}),
  };

  const serialized = isProduction ? JSON.stringify(entry) : JSON.stringify(entry, null, 2);

  if (level === "error") {
    console.error(serialized);
    return;
  }
  if (level === "warn") {
    console.warn(serialized);
    return;
  }
  // Route info/debug through warn so the `no-console` lint rule stays strict
  // while still producing output on stderr-friendly transports.
  if (!isProduction) {
    console.warn(serialized);
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!isProduction) {
      write("debug", message, context);
    }
  },
  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    write("error", message, context);
  },
};
