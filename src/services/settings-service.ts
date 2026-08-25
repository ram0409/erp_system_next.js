import "server-only";

import { SETTINGS_MESSAGES } from "@/constants/messages";
import { AUDIT_ACTIONS } from "@/constants/status";
import { duplicateFieldError, NotFoundError } from "@/lib/errors";
import * as auditRepository from "@/repositories/audit-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import type { OrganizationRow } from "@/repositories/organization-repository";
import type { OrganizationSettings } from "@/types/settings";
import type { ActorContext } from "@/types/session";
import { formatFullName } from "@/utils/format";
import type { UpdateOrganizationSettingsInput } from "@/validations/settings";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Organization";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toSettings(row: OrganizationRow): OrganizationSettings {
  return {
    publicId: row.publicId,
    name: row.name,
    legalName: row.legalName,
    code: row.code,
    email: row.email,
    phone: row.phone,
    taxId: row.taxId,
    addressLine: row.addressLine,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireOrganization(): Promise<OrganizationRow> {
  const row = await organizationRepository.findPrimary();
  if (!row) {
    throw new NotFoundError(SETTINGS_MESSAGES.ORGANIZATION_MISSING);
  }
  return row;
}

async function writeAudit(
  actor: ActorContext,
  meta: AuditMeta,
  entry: {
    readonly entityId: number;
    readonly entityPublicId: string;
    readonly summary: string;
    readonly changes?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await auditRepository.record({
    action: AUDIT_ACTIONS.UPDATE,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: formatFullName(actor.user.firstName, actor.user.lastName),
    entityType: ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  return toSettings(await requireOrganization());
}

export async function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<OrganizationSettings> {
  const existing = await requireOrganization();

  if (await organizationRepository.isCodeTaken(input.code, existing.id)) {
    throw duplicateFieldError("code", "Organisation code");
  }

  const updated = await organizationRepository.updateById(existing.id, {
    name: input.name,
    legalName: emptyToNull(input.legalName),
    code: input.code,
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    taxId: emptyToNull(input.taxId),
    addressLine: emptyToNull(input.addressLine),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
  });

  await writeAudit(actor, meta, {
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated organisation settings for ${updated.name}`,
    changes: {
      name: { from: existing.name, to: updated.name },
      code: { from: existing.code, to: updated.code },
      email: { from: existing.email, to: updated.email },
    },
  });

  return toSettings(updated);
}
