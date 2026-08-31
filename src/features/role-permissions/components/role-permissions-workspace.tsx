"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/form-actions";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { useCan } from "@/components/providers/permissions-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_PERMISSION_MESSAGES, UNSAVED_CHANGES_PROMPT } from "@/constants/messages";
import type { NavIconName } from "@/constants/navigation";
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import {
  ALL_PERMISSION_KEYS,
  groupedPermissionCatalog,
  PERMISSION_ACTION_LABELS,
  PERMISSION_GROUPS,
  PERMISSIONS,
  buildPermissionKey,
  type PermissionAction,
  type PermissionGroupId,
  type PermissionModule,
  type PermissionModuleDefinition,
} from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { saveRolePermissionsAction } from "@/features/role-permissions/actions";
import {
  MATRIX_ACTION_COLUMNS,
  catalogKeysForModule,
  catalogKeysForModules,
  grantStateFor,
  keysEqual,
  setAllGranted,
  setGroupGranted,
  setModuleGranted,
  toggleKey,
  toKeySet,
} from "@/lib/permission-matrix";
import { cn } from "@/lib/utils";
import type { PermissionMatrixData } from "@/types/role-permissions";

const GROUP_ICONS: Readonly<Record<PermissionGroupId, NavIconName>> = {
  dashboard: "dashboard",
  administration: "administration",
  settings: "settings",
};

const MODULE_ICONS: Readonly<Record<PermissionModule, NavIconName>> = {
  dashboard: "dashboard",
  users: "users",
  roles: "roles",
  role_permissions: "permissions",
  branches: "branches",
  settings: "general-settings",
  audit_logs: "audit-logs",
};

interface RolePermissionsWorkspaceProps {
  readonly matrix: PermissionMatrixData;
  readonly actorRolePublicId: string;
}

function roleHref(publicId: string): string {
  return `${ROUTES.ROLE_PERMISSIONS}?${TABLE_QUERY_KEYS.ROLE}=${encodeURIComponent(publicId)}`;
}

function checkboxState(state: ReturnType<typeof grantStateFor>): boolean | "indeterminate" {
  if (state === "all") {
    return true;
  }
  if (state === "some") {
    return "indeterminate";
  }
  return false;
}

export function RolePermissionsWorkspace({
  matrix,
  actorRolePublicId,
}: RolePermissionsWorkspaceProps) {
  const router = useRouter();
  const canEdit = useCan(PERMISSIONS.ROLE_PERMISSIONS.EDIT);
  const { roles, selected, grantedKeys, readOnly } = matrix;
  const interactive = canEdit && !readOnly;

  const [draftKeys, setDraftKeys] = useState<string[]>(() => [...grantedKeys]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRolePublicId, setPendingRolePublicId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<PermissionGroupId>>(
    () => new Set([PERMISSION_GROUPS.ADMINISTRATION]),
  );

  const isDirty = !keysEqual(draftKeys, grantedKeys);
  const keySet = useMemo(() => toKeySet(draftKeys), [draftKeys]);
  const globalState = grantStateFor(keySet, ALL_PERMISSION_KEYS);
  const groups = groupedPermissionCatalog();
  const disabled = !interactive || isSubmitting;

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  if (!selected) {
    return (
      <Card>
        <EmptyState
          title="No roles to configure"
          description="Create a role before granting permissions."
          className="px-5 pb-5"
        />
      </Card>
    );
  }

  function goToRole(publicId: string) {
    router.replace(roleHref(publicId), { scroll: false });
  }

  function toggleGroupOpen(groupId: PermissionGroupId) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function requestRoleChange(publicId: string) {
    if (publicId === selected?.publicId) {
      return;
    }
    if (isDirty) {
      setPendingRolePublicId(publicId);
      return;
    }
    goToRole(publicId);
  }

  async function onSave() {
    if (!selected || !interactive) {
      return;
    }

    setIsSubmitting(true);
    const result = await saveRolePermissionsAction({
      rolePublicId: selected.publicId,
      keys: draftKeys,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setDraftKeys([...result.data.grantedKeys]);
    toast.success(result.message);
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Select a role to grant permissions.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[min(28rem,70vh)] space-y-1 overflow-y-auto p-2 sm:p-3">
            {roles.map((role) => {
              const active = role.publicId === selected.publicId;
              return (
                <button
                  key={role.publicId}
                  type="button"
                  onClick={() => requestRoleChange(role.publicId)}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 text-foreground ring-primary/15 ring-1"
                      : "hover:bg-accent text-foreground",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{role.name}</span>
                    <StatusBadge status={role.status} />
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {role.isSuperAdmin ? <Badge variant="info">Super Admin</Badge> : null}
                    {role.isSystem && !role.isSuperAdmin ? <Badge variant="neutral">System</Badge> : null}
                    {role.publicId === actorRolePublicId ? <Badge variant="outline">You</Badge> : null}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle>{selected.name}</CardTitle>
              <CardDescription>
                {draftKeys.length} of {ALL_PERMISSION_KEYS.length} permissions granted
              </CardDescription>
            </div>
            {interactive ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="role-permission-select-all"
                  checked={checkboxState(globalState)}
                  disabled={isSubmitting}
                  onCheckedChange={(checked) => setDraftKeys(setAllGranted(checked === true))}
                />
                <Label htmlFor="role-permission-select-all" className="font-normal">
                  Select all
                </Label>
              </div>
            ) : null}
          </CardHeader>

          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 min-w-52">Module</TableHead>
                  <TableHead className="w-16 text-center">All</TableHead>
                  {MATRIX_ACTION_COLUMNS.map((action) => (
                    <TableHead key={action} className="w-20 text-center">
                      {PERMISSION_ACTION_LABELS[action]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => {
                  const nested = group.modules.length > 1;
                  const open = !nested || openGroups.has(group.groupId);
                  const groupKeys = catalogKeysForModules(group.modules);
                  const groupState = grantStateFor(keySet, groupKeys);
                  const granted = groupKeys.filter((key) => keySet.has(key)).length;
                  const GroupIcon = NAV_ICONS[GROUP_ICONS[group.groupId]];
                  const panelId = `permission-submodules-${group.groupId}`;

                  return (
                    <Fragment key={group.groupId}>
                      {nested ? (
                        <TableRow className="hover:bg-muted/60 bg-muted/50">
                          <TableCell className="bg-muted/50 sticky left-0 z-10">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={panelId}
                              onClick={() => toggleGroupOpen(group.groupId)}
                              className="flex w-full items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ChevronDownIcon
                                className={cn(
                                  "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                                  open ? "rotate-0" : "-rotate-90",
                                )}
                                aria-hidden="true"
                              />
                              <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
                                <GroupIcon className="size-3.5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-semibold">{group.label}</span>
                                <span className="text-muted-foreground text-xs">
                                  {granted} of {groupKeys.length} granted · {group.modules.length}{" "}
                                  sub-modules
                                </span>
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <CenteredCheckbox
                              id={`group-all-${group.groupId}`}
                              label={`Grant all ${group.label} permissions`}
                              checked={checkboxState(groupState)}
                              disabled={disabled}
                              onCheckedChange={(grantedNext) =>
                                setDraftKeys((current) =>
                                  setGroupGranted(current, group.modules, grantedNext),
                                )
                              }
                            />
                          </TableCell>
                          {MATRIX_ACTION_COLUMNS.map((action) => (
                            <TableCell key={action} />
                          ))}
                        </TableRow>
                      ) : null}
                      {open
                        ? group.modules.map((definition, index) => (
                            <ModuleRow
                              key={definition.module}
                              rowId={index === 0 && nested ? panelId : undefined}
                              definition={definition}
                              nested={nested}
                              draftKeys={keySet}
                              disabled={disabled}
                              onToggle={(key, grantedNext) =>
                                setDraftKeys((current) => toggleKey(current, key, grantedNext))
                              }
                              onToggleModule={(grantedNext) =>
                                setDraftKeys((current) =>
                                  setModuleGranted(current, definition, grantedNext),
                                )
                              }
                            />
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {interactive ? (
            <CardFooter className="justify-end">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSave();
                }}
              >
                <FormActions
                  isSubmitting={isSubmitting}
                  disableSubmit={!isDirty}
                  onCancel={() => setDraftKeys([...grantedKeys])}
                  cancelLabel="Discard"
                  submitLabel="Save permissions"
                />
              </form>
            </CardFooter>
          ) : (
            <CardFooter>
              <p className="text-muted-foreground text-sm">{ROLE_PERMISSION_MESSAGES.SUPER_ADMIN_LOCKED}</p>
            </CardFooter>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={pendingRolePublicId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRolePublicId(null);
          }
        }}
        title="Unsaved changes"
        description={UNSAVED_CHANGES_PROMPT}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          if (pendingRolePublicId) {
            goToRole(pendingRolePublicId);
          }
        }}
      />
    </>
  );
}

function ModuleRow({
  rowId,
  definition,
  nested,
  draftKeys,
  disabled,
  onToggle,
  onToggleModule,
}: {
  readonly rowId?: string;
  readonly definition: PermissionModuleDefinition;
  readonly nested: boolean;
  readonly draftKeys: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly onToggle: (key: string, granted: boolean) => void;
  readonly onToggleModule: (granted: boolean) => void;
}) {
  const moduleKeys = catalogKeysForModule(definition);
  const moduleState = grantStateFor(draftKeys, moduleKeys);
  const ModuleIcon = NAV_ICONS[MODULE_ICONS[definition.module]];
  const allowed = new Set<PermissionAction>(definition.actions);

  return (
    <TableRow id={rowId}>
      <TableCell className="bg-card sticky left-0 z-10">
        <div className={cn("flex items-start gap-2.5", nested && "pl-4")}>
          <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
            <ModuleIcon className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{definition.label}</p>
            <p className="text-muted-foreground text-xs">{definition.description}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <CenteredCheckbox
          id={`module-all-${definition.module}`}
          label={`Grant all ${definition.label} permissions`}
          checked={checkboxState(moduleState)}
          disabled={disabled}
          onCheckedChange={onToggleModule}
        />
      </TableCell>
      {MATRIX_ACTION_COLUMNS.map((action) => {
        if (!allowed.has(action)) {
          return <TableCell key={action} className="text-center" />;
        }
        const key = buildPermissionKey(definition.module, action);
        return (
          <TableCell key={action} className="text-center">
            <CenteredCheckbox
              id={key}
              label={`${definition.label} ${PERMISSION_ACTION_LABELS[action]}`}
              checked={draftKeys.has(key)}
              disabled={disabled}
              onCheckedChange={(granted) => onToggle(key, granted)}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function CenteredCheckbox({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean | "indeterminate";
  readonly disabled: boolean;
  readonly onCheckedChange: (granted: boolean) => void;
}) {
  return (
    <div className="flex justify-center">
      <Checkbox
        id={id}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </div>
  );
}
