import {
  ALL_PERMISSION_KEYS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_CATALOG,
  buildPermissionKey,
  type PermissionAction,
  type PermissionKey,
  type PermissionModuleDefinition,
} from "@/constants/permissions";

/**
 * Pure matrix helpers. The page renders from PERMISSION_CATALOG; these functions
 * keep select-all, per-module toggles and summaries consistent with that catalog
 * so a forged or stale key cannot appear as a checked cell.
 */

export const MATRIX_ACTION_COLUMNS: readonly PermissionAction[] = (
  Object.values(PERMISSION_ACTIONS) as PermissionAction[]
).filter((action) => PERMISSION_CATALOG.some((definition) => definition.actions.includes(action)));

export function catalogKeysForModule(
  definition: PermissionModuleDefinition,
): readonly PermissionKey[] {
  return definition.actions.map((action) =>
    buildPermissionKey(definition.module, action),
  ) as PermissionKey[];
}

export function toKeySet(keys: readonly string[]): ReadonlySet<string> {
  return new Set(keys);
}

export function keysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const set = new Set(left);
  return right.every((key) => set.has(key));
}

export function toggleKey(keys: readonly string[], key: string, granted: boolean): string[] {
  const next = new Set(keys);
  if (granted) {
    next.add(key);
  } else {
    next.delete(key);
  }
  return [...next];
}

export function setModuleGranted(
  keys: readonly string[],
  definition: PermissionModuleDefinition,
  granted: boolean,
): string[] {
  const next = new Set(keys);
  for (const key of catalogKeysForModule(definition)) {
    if (granted) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }
  return [...next];
}

export function setAllGranted(granted: boolean): string[] {
  return granted ? [...ALL_PERMISSION_KEYS] : [];
}

export type GrantState = "all" | "some" | "none";

export function grantStateFor(
  keys: ReadonlySet<string>,
  candidates: readonly string[],
): GrantState {
  if (candidates.length === 0) {
    return "none";
  }
  const granted = candidates.filter((key) => keys.has(key)).length;
  if (granted === 0) {
    return "none";
  }
  if (granted === candidates.length) {
    return "all";
  }
  return "some";
}

export function summarizeGrants(
  keys: ReadonlySet<string>,
): readonly { readonly label: string; readonly actions: readonly PermissionAction[] }[] {
  return PERMISSION_CATALOG.flatMap((definition) => {
    const actions = definition.actions.filter((action) =>
      keys.has(buildPermissionKey(definition.module, action)),
    );
    if (actions.length === 0) {
      return [];
    }
    return [{ label: definition.label, actions }];
  });
}

export function formatActionList(actions: readonly PermissionAction[]): string {
  return actions.map((action) => PERMISSION_ACTION_LABELS[action]).join(", ");
}
