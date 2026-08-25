import type { AuditAction } from "@/constants/status";

/**
 * Client-safe audit row. Sequential primary keys stay in the repository; the
 * list key is only used for React reconciliation.
 */

export interface AuditLogListItem {
  readonly key: string;
  readonly action: AuditAction;
  readonly actionLabel: string;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
  readonly entityType: string;
  readonly entityPublicId: string | null;
  readonly summary: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}
