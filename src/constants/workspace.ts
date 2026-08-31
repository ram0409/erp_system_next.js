export const WORKSPACE_COOKIE_NAME = "erp.workspace";
export const WORKSPACE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface WorkspaceCookieValue {
  readonly branchPublicId: string;
}

/** Compact cookie payload. Public ids do not contain `|`. */
export function serializeWorkspaceCookie(value: WorkspaceCookieValue): string {
  return value.branchPublicId;
}

export function parseWorkspaceCookie(raw: string | null | undefined): WorkspaceCookieValue | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  const separator = trimmed.indexOf("|");
  // Older cookies were `entityPublicId|branchPublicId`.
  const branchPublicId = (separator === -1 ? trimmed : trimmed.slice(separator + 1)).trim();
  if (branchPublicId.length < 8 || branchPublicId.length > 32) {
    return null;
  }

  return { branchPublicId };
}
