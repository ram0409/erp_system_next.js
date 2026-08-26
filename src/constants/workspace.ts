export const WORKSPACE_COOKIE_NAME = "erp.workspace";
export const WORKSPACE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface WorkspaceCookieValue {
  readonly entityPublicId: string;
  readonly branchPublicId: string;
}

/** Compact cookie payload. Public ids do not contain `|`. */
export function serializeWorkspaceCookie(value: WorkspaceCookieValue): string {
  return `${value.entityPublicId}|${value.branchPublicId}`;
}

export function parseWorkspaceCookie(raw: string | null | undefined): WorkspaceCookieValue | null {
  if (!raw) {
    return null;
  }

  const separator = raw.indexOf("|");
  if (separator < 8) {
    return null;
  }

  const entityPublicId = raw.slice(0, separator).trim();
  const branchPublicId = raw.slice(separator + 1).trim();
  if (entityPublicId.length < 8 || entityPublicId.length > 32) {
    return null;
  }
  if (branchPublicId.length < 8 || branchPublicId.length > 32) {
    return null;
  }

  return { entityPublicId, branchPublicId };
}
