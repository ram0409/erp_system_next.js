import "server-only";

import { SETTINGS_MESSAGES } from "@/constants/messages";
import {
  DEFAULT_PASSWORD_POLICY,
  getPasswordPolicyRules,
  resolvePasswordPolicyId,
} from "@/constants/password-policy";
import {
  inactivityDeactivateLabel,
  isInactivityDeactivateDays,
} from "@/constants/security";
import { AUDIT_ACTIONS } from "@/constants/status";
import { duplicateFieldError, NotFoundError, ValidationError } from "@/lib/errors";
import { buildLogoPublicPath, detectLogoExtension } from "@/lib/logo";
import { deleteLogoFile, writeLogoFile } from "@/lib/logo-storage";
import * as auditRepository from "@/repositories/audit-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import type { OrganizationRow } from "@/repositories/organization-repository";
import * as inactivityService from "@/services/inactivity-service";
import type { ActorContext } from "@/types/session";
import type { CompanyBrand, OrganizationSettings, PasswordPolicySettings, SecurityPolicy } from "@/types/settings";
import { formatFullName } from "@/utils/format";
import type {
  UpdateOrganizationSettingsInput,
  UpdatePasswordPolicyInput,
  UpdateSecurityPolicyInput,
} from "@/validations/settings";
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
    logoUrl: row.logoPath,
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

/** Sidebar brand. Safe to call from the dashboard layout for every signed-in user. */
export async function getCompanyBrand(): Promise<CompanyBrand> {
  const row = await organizationRepository.findPrimary();
  return {
    name: row?.name ?? null,
    logoUrl: row?.logoPath ?? null,
  };
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

export async function uploadCompanyLogo(
  file: File,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<{ logoUrl: string }> {
  const existing = await requireOrganization();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectLogoExtension(bytes, file.type);

  if (!extension) {
    throw new ValidationError(SETTINGS_MESSAGES.LOGO_INVALID, {
      fieldErrors: [{ field: "file", message: SETTINGS_MESSAGES.LOGO_INVALID }],
    });
  }

  const publicPath = buildLogoPublicPath(existing.publicId, extension, Date.now());
  await writeLogoFile(publicPath, bytes);

  try {
    await organizationRepository.updateLogoPath(existing.id, publicPath);
  } catch (error) {
    await deleteLogoFile(publicPath);
    throw error;
  }

  if (existing.logoPath && existing.logoPath !== publicPath) {
    await deleteLogoFile(existing.logoPath);
  }

  await writeAudit(actor, meta, {
    entityId: existing.id,
    entityPublicId: existing.publicId,
    summary: `Updated company logo for ${existing.name}`,
  });

  return { logoUrl: publicPath };
}

export async function removeCompanyLogo(
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<{ logoUrl: null }> {
  const existing = await requireOrganization();

  await organizationRepository.updateLogoPath(existing.id, null);
  await deleteLogoFile(existing.logoPath);

  await writeAudit(actor, meta, {
    entityId: existing.id,
    entityPublicId: existing.publicId,
    summary: `Removed company logo for ${existing.name}`,
  });

  return { logoUrl: null };
}

function toSecurityPolicy(row: OrganizationRow): SecurityPolicy {
  const days = row.inactivityDeactivateAfterDays;
  return {
    inactivityDeactivateAfterDays:
      days !== null && isInactivityDeactivateDays(days) ? days : null,
  };
}

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  return toSecurityPolicy(await requireOrganization());
}

export async function updateSecurityPolicy(
  input: UpdateSecurityPolicyInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<SecurityPolicy> {
  const existing = await requireOrganization();
  const previous = toSecurityPolicy(existing);
  const nextDays = input.inactivityDeactivateAfterDays;

  const updated = await organizationRepository.updateInactivityDeactivateAfterDays(
    existing.id,
    nextDays,
  );

  const previousLabel =
    previous.inactivityDeactivateAfterDays === null
      ? "Off"
      : inactivityDeactivateLabel(previous.inactivityDeactivateAfterDays);
  const nextLabel = nextDays === null ? "Off" : inactivityDeactivateLabel(nextDays);

  await writeAudit(actor, meta, {
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated inactivity policy from ${previousLabel} to ${nextLabel}`,
    changes: {
      inactivityDeactivateAfterDays: {
        from: previous.inactivityDeactivateAfterDays,
        to: nextDays,
      },
    },
  });

  await inactivityService.applyInactivityPolicy({ actor });

  return toSecurityPolicy(updated);
}

function toPasswordPolicy(row: OrganizationRow): PasswordPolicySettings {
  return { policy: resolvePasswordPolicyId(row.passwordPolicy) };
}

export async function getPasswordPolicy(): Promise<PasswordPolicySettings> {
  const row = await organizationRepository.findPrimary();
  if (!row) {
    return { policy: DEFAULT_PASSWORD_POLICY };
  }
  return toPasswordPolicy(row);
}

export async function updatePasswordPolicy(
  input: UpdatePasswordPolicyInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<PasswordPolicySettings> {
  const existing = await requireOrganization();
  const previous = toPasswordPolicy(existing);
  const updated = await organizationRepository.updatePasswordPolicy(existing.id, input.policy);

  await writeAudit(actor, meta, {
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated password policy from ${getPasswordPolicyRules(previous.policy).label} to ${getPasswordPolicyRules(input.policy).label}`,
    changes: {
      passwordPolicy: { from: previous.policy, to: input.policy },
    },
  });

  return toPasswordPolicy(updated);
}
