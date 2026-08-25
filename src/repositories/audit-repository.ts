import "server-only";

import type { AuditAction } from "@/constants/status";
import { buildPaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { sanitizeAuditChanges } from "@/lib/redact";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";
import { contains } from "./base";
import { withPrismaErrors } from "./prisma-errors";
import type { Prisma } from "@generated/prisma/client";

/**
 * The audit trail. Actor details are denormalized onto the row so an entry stays
 * readable after the user record is removed, and the foreign key is SetNull so
 * deleting a user never erases what they did.
 */

const LIST_SELECT = {
  id: true,
  action: true,
  actorEmail: true,
  actorName: true,
  entityType: true,
  entityPublicId: true,
  summary: true,
  ipAddress: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type AuditLogRow = Prisma.AuditLogGetPayload<{ select: typeof LIST_SELECT }>;

const FEED_SELECT = {
  action: true,
  actorName: true,
  entityType: true,
  summary: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type AuditFeedRow = Prisma.AuditLogGetPayload<{ select: typeof FEED_SELECT }>;

export interface RecordAuditInput {
  readonly action: AuditAction;
  readonly actorUserId?: number | null;
  readonly actorEmail?: string | null;
  readonly actorName?: string | null;
  readonly entityType: string;
  readonly entityId?: number | null;
  readonly entityPublicId?: string | null;
  readonly summary?: string | null;
  /** Raw field diff; secrets are stripped here before insert. */
  readonly changes?: Prisma.InputJsonValue | undefined;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}

/**
 * Writes an audit entry. Never throws: an audit failure must not roll back the
 * business operation that succeeded, so the error is swallowed and reported to
 * the caller as `false` for logging.
 */
export async function record(input: RecordAuditInput): Promise<boolean> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        actorEmail: input.actorEmail ?? null,
        actorName: input.actorName ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityPublicId: input.entityPublicId ?? null,
        summary: input.summary ?? null,
        ...(input.changes === undefined
          ? {}
          : { changes: sanitizeAuditChanges(input.changes) as Prisma.InputJsonValue }),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent?.slice(0, 400) ?? null,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function list(
  filters: {
    readonly search?: string;
    readonly action?: AuditAction;
  },
  pagination: PaginationParams,
): Promise<PaginatedResult<AuditLogRow>> {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.search) {
    where.OR = [
      { actorName: contains(filters.search) },
      { actorEmail: contains(filters.search) },
      { summary: contains(filters.search) },
      { entityType: contains(filters.search) },
      { entityPublicId: contains(filters.search) },
    ];
  }

  const [items, total] = await withPrismaErrors("audit.list", () =>
    prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { id: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.auditLog.count({ where }),
    ]),
  );

  return buildPaginatedResult(items, total, pagination);
}

/** Recent activity for the dashboard feed. Login noise is filtered by the caller. */
export function listRecent(
  limit: number,
  excludedActions: readonly AuditAction[] = [],
): Promise<AuditFeedRow[]> {
  return withPrismaErrors("audit.listRecent", () =>
    prisma.auditLog.findMany({
      where: excludedActions.length > 0 ? { action: { notIn: [...excludedActions] } } : undefined,
      select: FEED_SELECT,
      orderBy: { id: "desc" },
      take: limit,
    }),
  );
}
