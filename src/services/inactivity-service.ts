import "server-only";

import {
  INACTIVITY_SWEEP_LIMIT,
  inactivityDeactivateLabel,
  isInactivityDeactivateDays,
} from "@/constants/security";
import { AUDIT_ACTIONS, RECORD_STATUS } from "@/constants/status";
import { logger } from "@/lib/logger";
import { sendAccountDeactivatedEmail } from "@/lib/mail";
import * as auditRepository from "@/repositories/audit-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import * as userRepository from "@/repositories/user-repository";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";

const USER_ENTITY = "User";
const SYSTEM_ACTOR_EMAIL = "system";
const SYSTEM_ACTOR_NAME = "Inactivity policy";
const MS_PER_DAY = 86_400_000;

export interface InactivitySweepResult {
  readonly deactivated: number;
}

export interface InactivitySweepOptions {
  /** Skip this user (the one who just signed in). */
  readonly excludeUserId?: number;
  readonly actor?: ActorContext;
}

function sweepActor(actor: ActorContext | undefined): {
  readonly actorUserId: number | null;
  readonly actorEmail: string;
  readonly actorName: string;
  readonly ipAddress: string | null;
} {
  if (!actor) {
    return {
      actorUserId: null,
      actorEmail: SYSTEM_ACTOR_EMAIL,
      actorName: SYSTEM_ACTOR_NAME,
      ipAddress: null,
    };
  }

  return {
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: formatFullName(actor.user.firstName, actor.user.lastName),
    ipAddress: actor.ipAddress,
  };
}

/**
 * Deactivates users who have not signed in within the organisation policy
 * window, bumps their session token version, writes audit rows, and emails them.
 * Super Admins are never auto-deactivated. Failures on a single user do not
 * stop the rest of the sweep.
 */
export async function applyInactivityPolicy(
  options: InactivitySweepOptions = {},
): Promise<InactivitySweepResult> {
  const organization = await organizationRepository.findPrimary();
  const configuredDays = organization?.inactivityDeactivateAfterDays ?? null;

  if (configuredDays === null) {
    return { deactivated: 0 };
  }

  if (!isInactivityDeactivateDays(configuredDays)) {
    logger.warn("Ignoring invalid inactivity deactivate setting", { days: configuredDays });
    return { deactivated: 0 };
  }

  const cutoff = new Date(Date.now() - configuredDays * MS_PER_DAY);
  const staleUsers = await userRepository.listStaleActiveUsers({
    cutoff,
    excludeUserId: options.excludeUserId,
    take: INACTIVITY_SWEEP_LIMIT,
  });

  if (staleUsers.length === 0) {
    return { deactivated: 0 };
  }

  const actor = sweepActor(options.actor);
  const organizationName = organization?.name ?? "the organisation";
  const periodLabel = inactivityDeactivateLabel(configuredDays);
  let deactivated = 0;

  for (const user of staleUsers) {
    try {
      await userRepository.update(user.publicId, {
        status: RECORD_STATUS.INACTIVE,
        incrementTokenVersion: true,
      });

      await auditRepository.record({
        action: AUDIT_ACTIONS.DEACTIVATE,
        actorUserId: actor.actorUserId,
        actorEmail: actor.actorEmail,
        actorName: actor.actorName,
        entityType: USER_ENTITY,
        entityId: user.id,
        entityPublicId: user.publicId,
        summary: `Deactivated for inactivity (${periodLabel})`,
        ipAddress: actor.ipAddress,
      });

      const mailed = await sendAccountDeactivatedEmail({
        to: user.email,
        recipientName: formatFullName(user.firstName, user.lastName),
        inactiveDays: configuredDays,
        organizationName,
      });

      if (!mailed) {
        logger.warn("Inactivity deactivation mail was not sent", {
          publicId: user.publicId,
        });
      }

      deactivated += 1;
    } catch (error) {
      logger.error("Failed to deactivate inactive user", {
        publicId: user.publicId,
        error,
      });
    }
  }

  return { deactivated };
}

/** Fire-and-forget wrapper so a failed sweep never fails sign-in. */
export function scheduleInactivitySweep(excludeUserId: number): void {
  void applyInactivityPolicy({ excludeUserId }).catch((error: unknown) => {
    logger.warn("Inactivity policy sweep failed after sign-in", { error });
  });
}
