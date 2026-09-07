import "server-only";

import { EXPORT_MAX_ROWS, TABLE_QUERY_KEYS } from "@/constants/pagination";
import { CUSTOMER_MESSAGES, ERROR_MESSAGES } from "@/constants/messages";
import {
  AUDIT_ACTIONS,
  RECORD_STATUS,
  RECORD_STATUS_LABELS,
  RECORD_STATUS_VALUES,
  type RecordStatus,
} from "@/constants/status";
import { duplicateFieldError, InternalError, NotFoundError, ValidationError } from "@/lib/errors";
import { emptyToNull } from "@/lib/normalize";
import { resolveAllowedValue, resolvePagination, resolveSearchTerm, resolveSort } from "@/lib/pagination";
import { getWorkspaceScope } from "@/lib/workspace-scope";
import * as auditRepository from "@/repositories/audit-repository";
import * as branchRepository from "@/repositories/branch-repository";
import * as customerRepository from "@/repositories/customer-repository";
import {
  CUSTOMER_SORT_FIELDS,
  type CustomerDetailRow,
  type CustomerListRow,
} from "@/repositories/customer-repository";
import * as organizationRepository from "@/repositories/organization-repository";
import type {
  CustomerBranchOption,
  CustomerDetail,
  CustomerExportResult,
  CustomerListItem,
} from "@/types/customer";
import type { PaginatedResult, RawSearchParams } from "@/types/pagination";
import type { ActorContext } from "@/types/session";
import { toCsv } from "@/utils/csv";
import { formatDate, formatFullName } from "@/utils/format";
import type {
  CreateCustomerInput,
  ExportCustomersInput,
  UpdateCustomerInput,
} from "@/validations/customer";
import type { Prisma } from "@generated/prisma/client";

const ENTITY_TYPE = "Customer";

interface AuditMeta {
  readonly userAgent?: string | null;
}

function requireOrganizationId(): Promise<number> {
  return organizationRepository.findPrimaryId().then((id) => {
    if (id === null) {
      throw new InternalError({
        internalDetail: "No organization row exists to attach a customer to.",
      });
    }
    return id;
  });
}

async function requireCustomer(publicId: string): Promise<CustomerDetailRow> {
  const row = await customerRepository.findByPublicId(publicId);
  if (!row) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  return row;
}

async function requireActiveBranchId(branchPublicId: string): Promise<number> {
  const branch = await branchRepository.findByPublicId(branchPublicId);
  if (!branch) {
    throw new NotFoundError(ERROR_MESSAGES.NOT_FOUND);
  }
  if (branch.status !== RECORD_STATUS.ACTIVE) {
    throw new ValidationError(CUSTOMER_MESSAGES.BRANCH_INACTIVE, {
      fieldErrors: [{ field: "branchPublicId", message: CUSTOMER_MESSAGES.BRANCH_INACTIVE }],
    });
  }
  return branch.id;
}

function toListItem(row: CustomerListRow): CustomerListItem {
  return {
    publicId: row.publicId,
    code: row.code,
    name: row.name,
    contactPerson: row.contactPerson,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    branch: {
      publicId: row.branch.publicId,
      code: row.branch.code,
      name: row.branch.name,
    },
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(row: CustomerDetailRow): CustomerDetail {
  return {
    ...toListItem(row),
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postalCode: row.postalCode,
    country: row.country,
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function actorName(actor: ActorContext): string {
  return formatFullName(actor.user.firstName, actor.user.lastName);
}

async function writeAudit(
  actor: ActorContext,
  meta: AuditMeta,
  entry: {
    readonly action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
    readonly entityId: number;
    readonly entityPublicId: string;
    readonly summary: string;
    readonly changes?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await auditRepository.record({
    action: entry.action,
    actorUserId: actor.userId,
    actorEmail: actor.user.email,
    actorName: actorName(actor),
    entityType: ENTITY_TYPE,
    entityId: entry.entityId,
    entityPublicId: entry.entityPublicId,
    summary: entry.summary,
    ...(entry.changes ? { changes: entry.changes } : {}),
    ipAddress: actor.ipAddress,
    userAgent: meta.userAgent ?? null,
  });
}

async function workspaceBranchFilter(): Promise<{ branchId?: number }> {
  const scope = await getWorkspaceScope();
  return scope ? { branchId: scope.branchId } : {};
}

async function resolveListFilters(searchParams: RawSearchParams) {
  const workspace = await workspaceBranchFilter();
  return {
    search: resolveSearchTerm(searchParams),
    status: resolveAllowedValue(searchParams, TABLE_QUERY_KEYS.STATUS, RECORD_STATUS_VALUES),
    ...workspace,
  };
}

export async function listCustomers(
  searchParams: RawSearchParams,
): Promise<PaginatedResult<CustomerListItem>> {
  const pagination = resolvePagination(searchParams);
  const sort = resolveSort(searchParams, CUSTOMER_SORT_FIELDS, "createdAt");
  const result = await customerRepository.list(
    await resolveListFilters(searchParams),
    pagination,
    sort,
  );

  return {
    items: result.items.map(toListItem),
    meta: result.meta,
  };
}

export async function getCustomer(publicId: string): Promise<CustomerDetail> {
  return toDetail(await requireCustomer(publicId));
}

export async function getCustomerBranchOptions(): Promise<readonly CustomerBranchOption[]> {
  const rows = await branchRepository.listOptions();
  return rows.map((row) => ({
    publicId: row.publicId,
    code: row.code,
    name: row.name,
  }));
}

async function assertUniqueCode(code: string, exceptPublicId?: string): Promise<void> {
  if (await customerRepository.isCodeTaken(code, exceptPublicId)) {
    throw duplicateFieldError("code", "Customer code");
  }
}

async function assertUniqueName(name: string, exceptPublicId?: string): Promise<void> {
  if (await customerRepository.isNameTaken(name, exceptPublicId)) {
    throw duplicateFieldError("name", "Customer name");
  }
}

export async function createCustomer(
  input: CreateCustomerInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<CustomerDetail> {
  const organizationId = await requireOrganizationId();
  const branchId = await requireActiveBranchId(input.branchPublicId);
  await assertUniqueCode(input.code);
  await assertUniqueName(input.name);

  const created = await customerRepository.create({
    organizationId,
    branchId,
    code: input.code,
    name: input.name,
    contactPerson: emptyToNull(input.contactPerson),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    addressLine1: emptyToNull(input.addressLine1),
    addressLine2: emptyToNull(input.addressLine2),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
    status: RECORD_STATUS.ACTIVE,
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.CREATE,
    entityId: created.id,
    entityPublicId: created.publicId,
    summary: `Created customer ${created.code} (${created.name})`,
    changes: {
      code: created.code,
      name: created.name,
      branch: created.branch.code,
    },
  });

  return toDetail(created);
}

export async function updateCustomer(
  input: UpdateCustomerInput,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<CustomerDetail> {
  const existing = await requireCustomer(input.publicId);
  const branchId = await requireActiveBranchId(input.branchPublicId);
  await assertUniqueCode(input.code, input.publicId);
  await assertUniqueName(input.name, input.publicId);

  const updated = await customerRepository.update(input.publicId, {
    branchId,
    code: input.code,
    name: input.name,
    contactPerson: emptyToNull(input.contactPerson),
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    addressLine1: emptyToNull(input.addressLine1),
    addressLine2: emptyToNull(input.addressLine2),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country),
  });

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.UPDATE,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `Updated customer ${updated.code} (${updated.name})`,
    changes: {
      code: { from: existing.code, to: updated.code },
      name: { from: existing.name, to: updated.name },
      branch: { from: existing.branch.code, to: updated.branch.code },
    },
  });

  return toDetail(updated);
}

export async function setCustomerStatus(
  publicId: string,
  status: RecordStatus,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<CustomerDetail> {
  const existing = await requireCustomer(publicId);

  if (existing.status === status) {
    return toDetail(existing);
  }

  const updated = await customerRepository.update(publicId, { status });
  const action =
    status === RECORD_STATUS.ACTIVE ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE;

  await writeAudit(actor, meta, {
    action,
    entityId: updated.id,
    entityPublicId: updated.publicId,
    summary: `${status === RECORD_STATUS.ACTIVE ? "Activated" : "Deactivated"} customer ${updated.code}`,
    changes: { status: { from: existing.status, to: status } },
  });

  return toDetail(updated);
}

export async function deleteCustomer(
  publicId: string,
  actor: ActorContext,
  meta: AuditMeta = {},
): Promise<void> {
  const existing = await requireCustomer(publicId);
  const deleted = await customerRepository.softDelete(publicId);

  await writeAudit(actor, meta, {
    action: AUDIT_ACTIONS.DELETE,
    entityId: deleted.id,
    entityPublicId: publicId,
    summary: `Deleted customer ${existing.code} (${existing.name})`,
  });
}

export async function exportCustomers(
  filters: ExportCustomersInput,
): Promise<CustomerExportResult> {
  const workspace = await workspaceBranchFilter();
  const { rows, total } = await customerRepository.listMatching(
    {
      search: filters.search,
      status: filters.status,
      ...workspace,
    },
    EXPORT_MAX_ROWS,
    { sortBy: "name", sortDir: "asc" },
  );

  const csv = toCsv(
    [
      "Code",
      "Name",
      "Branch",
      "Contact",
      "Email",
      "Phone",
      "City",
      "State",
      "Status",
      "Created",
    ],
    rows.map((row) => [
      row.code,
      row.name,
      row.branch.name,
      row.contactPerson,
      row.email,
      row.phone,
      row.city,
      row.state,
      RECORD_STATUS_LABELS[row.status],
      formatDate(row.createdAt),
    ]),
  );

  return {
    csv,
    filename: `customers-${formatDate(new Date()).replace(/\s+/g, "-").toLowerCase()}.csv`,
    rowCount: rows.length,
    truncated: total > rows.length,
  };
}
