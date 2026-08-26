"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormActions } from "@/components/forms/form-actions";
import { useCan } from "@/components/providers/permissions-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterBar } from "@/components/tables/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TABLE_QUERY_KEYS } from "@/constants/pagination";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_CATALOG,
  PERMISSIONS,
  buildPermissionKey,
  type PermissionAction,
  type PermissionModuleDefinition,
} from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { saveRolePermissionsAction } from "@/features/role-permissions/actions";
import {
  MATRIX_ACTION_COLUMNS,
  catalogKeysForModule,
  grantStateFor,
  keysEqual,
  setAllGranted,
  setModuleGranted,
  toggleKey,
  toKeySet,
} from "@/lib/permission-matrix";
import { cn } from "@/lib/utils";
import type { MatrixRoleOption, PermissionMatrixData } from "@/types/role-permissions";

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

  const isDirty = !keysEqual(draftKeys, grantedKeys);
  const keySet = useMemo(() => toKeySet(draftKeys), [draftKeys]);
  const globalState = grantStateFor(keySet, ALL_PERMISSION_KEYS);

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
      <Card>
        <FilterBar>
          <Select value={selected.publicId} onValueChange={requestRoleChange}>
            <SelectTrigger id="role-permission-role" aria-label="Role" className="sm:w-80">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.publicId} value={role.publicId}>
                  {roleOptionLabel(role, actorRolePublicId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selected.status} />
            {selected.isSuperAdmin ? <Badge variant="info">Super Admin</Badge> : null}
            {selected.isSystem && !selected.isSuperAdmin ? (
              <Badge variant="neutral">System</Badge>
            ) : null}
            {selected.publicId === actorRolePublicId ? (
              <Badge variant="outline">Your role</Badge>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {draftKeys.length} of {ALL_PERMISSION_KEYS.length} permissions selected
            </p>
          </div>
          {interactive ? (
            <div className="flex items-center gap-2 sm:ml-auto">
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
        </FilterBar>
        {readOnly ? (
          <p className="text-muted-foreground px-5 pt-2 text-sm">
            {ROLE_PERMISSION_MESSAGES.SUPER_ADMIN_LOCKED}
          </p>
        ) : null}
        <PermissionMatrixTable
          draftKeys={keySet}
          disabled={!interactive || isSubmitting}
          onToggle={(key, granted) => setDraftKeys((current) => toggleKey(current, key, granted))}
          onToggleModule={(definition, granted) =>
            setDraftKeys((current) => setModuleGranted(current, definition, granted))
          }
        />
        {interactive ? (
          <div className="flex justify-end px-5 py-4">
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
          </div>
        ) : (
          <div className="pb-4" />
        )}
      </Card>

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

function roleOptionLabel(role: MatrixRoleOption, actorRolePublicId: string): string {
  const tags = [
    role.status === "INACTIVE" ? "Inactive" : null,
    role.publicId === actorRolePublicId ? "You" : null,
  ].filter(Boolean);
  return tags.length > 0 ? `${role.name} (${tags.join(", ")})` : role.name;
}

function PermissionMatrixTable({
  draftKeys,
  disabled,
  onToggle,
  onToggleModule,
}: {
  readonly draftKeys: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly onToggle: (key: string, granted: boolean) => void;
  readonly onToggleModule: (definition: PermissionModuleDefinition, granted: boolean) => void;
}) {
  return (
    <div className="px-5 pt-4">
      <TableContainer className="border-border/80 rounded-sm border">
        <Table>
          <caption className="sr-only">Module and action permission matrix</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-48">Module</TableHead>
              <TableHead className="w-16 text-center">All</TableHead>
              {MATRIX_ACTION_COLUMNS.map((action) => (
                <TableHead key={action} className="w-20 text-center">
                  {PERMISSION_ACTION_LABELS[action]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_CATALOG.map((definition) => {
              const moduleKeys = catalogKeysForModule(definition);
              const moduleState = grantStateFor(draftKeys, moduleKeys);

              return (
                <TableRow key={definition.module}>
                  <TableCell>
                    <p className="font-medium">{definition.label}</p>
                    <p className="text-muted-foreground text-xs">{definition.description}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <MatrixCheckbox
                      label={`All ${definition.label} permissions`}
                      checked={checkboxState(moduleState)}
                      disabled={disabled}
                      onCheckedChange={(granted) => onToggleModule(definition, granted)}
                    />
                  </TableCell>
                  {MATRIX_ACTION_COLUMNS.map((action) => (
                    <TableCell key={action} className="text-center">
                      <ModuleActionCell
                        definition={definition}
                        action={action}
                        granted={draftKeys.has(buildPermissionKey(definition.module, action))}
                        disabled={disabled}
                        onToggle={onToggle}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function ModuleActionCell({
  definition,
  action,
  granted,
  disabled,
  onToggle,
}: {
  readonly definition: PermissionModuleDefinition;
  readonly action: PermissionAction;
  readonly granted: boolean;
  readonly disabled: boolean;
  readonly onToggle: (key: string, granted: boolean) => void;
}) {
  if (!definition.actions.includes(action)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const key = buildPermissionKey(definition.module, action);
  return (
    <MatrixCheckbox
      label={`${definition.label} ${PERMISSION_ACTION_LABELS[action]}`}
      checked={granted}
      disabled={disabled}
      onCheckedChange={(nextGranted) => onToggle(key, nextGranted)}
    />
  );
}

function MatrixCheckbox({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  readonly label: string;
  readonly checked: boolean | "indeterminate";
  readonly disabled: boolean;
  readonly onCheckedChange: (granted: boolean) => void;
}) {
  return (
    <Checkbox
      aria-label={label}
      checked={checked}
      disabled={disabled}
      className={cn("mx-auto")}
      onCheckedChange={(value) => onCheckedChange(value === true)}
    />
  );
}
