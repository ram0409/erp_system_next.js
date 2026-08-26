import type { PermissionKey } from "@/constants/permissions";
import type { RecordStatus } from "@/constants/status";

/** The authenticated user, as needed by the UI. Never carries a password hash. */
export interface SessionUser {
  readonly publicId: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly status: RecordStatus;
  readonly role: {
    readonly publicId: string;
    readonly slug: string;
    readonly name: string;
    readonly isSuperAdmin: boolean;
  };
  readonly branch: {
    readonly publicId: string;
    readonly code: string;
    readonly name: string;
    readonly entity: {
      readonly publicId: string;
      readonly code: string;
      readonly name: string;
    };
  };
}

/**
 * Server-side actor for the current request. Resolved fresh from the database on
 * every request, which is what makes deactivation and permission changes take
 * effect immediately. Internal numeric ids stay here and are never serialized to
 * the client.
 */
export interface ActorContext {
  /** Internal primary key, used for audit attribution and foreign keys. */
  readonly userId: number;
  readonly roleId: number;
  readonly branchId: number;
  readonly user: SessionUser;
  readonly permissions: ReadonlySet<PermissionKey>;
  readonly ipAddress: string | null;
  /** Home legal entity of the signed-in user's assigned branch. */
  readonly entityId: number;
}

/**
 * What the browser is allowed to know about authorization. Used only to hide
 * controls; every mutation still re-checks on the server. Permissions are a
 * list rather than a Set so the value can cross the server/client boundary.
 */
export interface PermissionSnapshot {
  readonly isSuperAdmin: boolean;
  readonly permissions: readonly PermissionKey[];
}

/** Claims held in the session cookie. Deliberately minimal — no permissions. */
export interface SessionClaims {
  readonly userPublicId: string;
  /** Incremented on password change or forced logout to invalidate old cookies. */
  readonly tokenVersion: number;
}
