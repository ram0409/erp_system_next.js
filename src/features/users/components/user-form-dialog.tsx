"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAction, updateUserAction } from "@/features/users/actions";
import { SUCCESS_MESSAGES } from "@/constants/messages";
import {
  PHONE_DIGIT_COUNT,
  enterPlaceholder,
  phoneRegisterOptions,
  selectPlaceholder,
} from "@/lib/form-fields";
import { applyServerFieldErrors } from "@/lib/form-action-errors";
import type { UserBranchOption, UserDetail, UserRoleOption } from "@/types/user";
import { createUserSchema, updateUserSchema, type CreateUserInput } from "@/validations/user";

const EMPTY_VALUES: CreateUserInput = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  joinDate: "",
  branchPublicId: "",
  rolePublicId: "",
};

const editSchema = updateUserSchema.omit({ publicId: true });

function valuesFromDetail(detail: UserDetail): CreateUserInput {
  return {
    ...EMPTY_VALUES,
    employeeCode: detail.employeeCode,
    firstName: detail.firstName,
    lastName: detail.lastName,
    email: detail.email,
    phone: detail.phone ?? "",
    joinDate: detail.joinDate ? detail.joinDate.slice(0, 10) : "",
    branchPublicId: detail.branch.publicId.trim(),
    rolePublicId: detail.role.publicId.trim(),
  };
}

export type UserFormMode = "create" | "edit" | "view";

interface UserFormDialogProps {
  open: boolean;
  mode: UserFormMode;
  detail: UserDetail | null;
  isLoading?: boolean;
  branches: readonly UserBranchOption[];
  roles: readonly UserRoleOption[];
  /** Prefills Branch on Add user from the current workspace. */
  defaultBranchPublicId?: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string, credentials?: CreatedUserCredentials) => void;
}

export interface CreatedUserCredentials {
  readonly email: string;
  readonly loginUrl: string;
  readonly temporaryPassword: string;
}

export function UserFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  branches,
  roles,
  defaultBranchPublicId = "",
  onOpenChange,
  onSuccess,
}: UserFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);

  const formValues = useMemo(() => {
    if (mode === "create" || !detail) {
      return {
        ...EMPTY_VALUES,
        branchPublicId: defaultBranchPublicId,
      };
    }
    return valuesFromDetail(detail);
  }, [mode, detail, defaultBranchPublicId]);

  const branchOptions = useMemo(() => {
    const options = [...branches];
    if (detail && !options.some((branch) => branch.publicId === detail.branch.publicId)) {
      options.push({
        publicId: detail.branch.publicId,
        code: detail.branch.code,
        name: `${detail.branch.name} (inactive)`,
      });
    }
    return options;
  }, [branches, detail]);

  const roleOptions = useMemo(() => {
    // Super Admin is seeded, not assigned from the user form.
    const visible = roles.filter((role) => !role.isSuperAdmin);
    if (detail && !visible.some((role) => role.publicId === detail.role.publicId)) {
      visible.push({
        publicId: detail.role.publicId,
        name: `${detail.role.name}${detail.role.status !== "ACTIVE" ? " (inactive)" : ""}`,
        slug: detail.role.slug,
        isSuperAdmin: detail.role.isSuperAdmin,
      });
    }
    return visible;
  }, [detail, roles]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(
      mode === "create" ? createUserSchema : editSchema,
    ) as unknown as Resolver<CreateUserInput>,
    defaultValues: formValues,
    values: formValues,
  });

  useEffect(() => {
    reset(formValues);
  }, [formValues, reset]);

  const title = mode === "create" ? "Add user" : mode === "edit" ? "Edit user" : "User details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) {
      return;
    }
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateUserAction({
            publicId: detail.publicId,
            employeeCode: values.employeeCode,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            joinDate: values.joinDate,
            branchPublicId: values.branchPublicId,
            rolePublicId: values.rolePublicId,
          })
        : await createUserAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        applyServerFieldErrors(result.errors, setError);
      }
      setFormError(result.message);
      return;
    }

    if (mode === "create" && "mailDelivered" in result.data) {
      onSuccess(
        result.data.mailDelivered === false && result.data.temporaryPassword
          ? SUCCESS_MESSAGES.USER_WELCOME_LOCAL
          : SUCCESS_MESSAGES.USER_WELCOME_SENT,
        result.data.temporaryPassword
          ? {
              email: result.data.email,
              loginUrl: result.data.loginUrl,
              temporaryPassword: result.data.temporaryPassword,
            }
          : undefined,
      );
    } else {
      onSuccess(result.message);
    }
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFormError(null);
        }
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create"
          ? "A temporary password is generated and emailed with the sign-in link. It expires in 1 day. The person must change it on first sign-in."
          : mode === "edit"
            ? "Password is not edited here. Use Send password reset from the user list."
            : undefined
      }
      size="lg"
      isSubmitting={isSubmitting}
      footer={
        readOnly ? (
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <FormActions
            form="user-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create user" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading user…</p>
      ) : (
        <form
          id="user-form"
          key={mode === "create" ? "create" : (detail?.publicId ?? "edit")}
          onSubmit={onSubmit}
          className="space-y-6"
          noValidate
        >
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <FormSection title="Identity">
            <FormField
              htmlFor="employeeCode"
              label="Employee code"
              required
              error={errors.employeeCode?.message}
              hint="Used as the username at sign-in."
            >
              <Input
                id="employeeCode"
                autoComplete="off"
                placeholder={enterPlaceholder("employee code")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.employeeCode ? true : undefined}
                {...register("employeeCode")}
              />
            </FormField>
            <FormField htmlFor="email" label="Email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                placeholder={enterPlaceholder("email")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
            </FormField>
            <FormField
              htmlFor="firstName"
              label="First name"
              required
              error={errors.firstName?.message}
            >
              <Input
                id="firstName"
                autoComplete="off"
                placeholder={enterPlaceholder("first name")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.firstName ? true : undefined}
                {...register("firstName")}
              />
            </FormField>
            <FormField
              htmlFor="lastName"
              label="Last name"
              required
              error={errors.lastName?.message}
            >
              <Input
                id="lastName"
                autoComplete="off"
                placeholder={enterPlaceholder("last name")}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.lastName ? true : undefined}
                {...register("lastName")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                autoComplete="off"
                placeholder={enterPlaceholder("phone number")}
                inputMode="numeric"
                maxLength={PHONE_DIGIT_COUNT}
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.phone ? true : undefined}
                {...register("phone", phoneRegisterOptions)}
              />
            </FormField>
            <FormField htmlFor="joinDate" label="Join date" error={errors.joinDate?.message}>
              <Input
                id="joinDate"
                type="date"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.joinDate ? true : undefined}
                {...register("joinDate")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Assignment">
            <FormField
              htmlFor="branchPublicId"
              label="Branch"
              required
              error={errors.branchPublicId?.message}
            >
              <Controller
                name="branchPublicId"
                control={control}
                render={({ field }) => {
                  const selected = branchOptions.find((branch) => branch.publicId === field.value);
                  return (
                    <Select
                      key={field.value || "branch-empty"}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={readOnly || isSubmitting}
                    >
                      <SelectTrigger
                        id="branchPublicId"
                        aria-invalid={errors.branchPublicId ? true : undefined}
                      >
                        <SelectValue placeholder={selectPlaceholder("branch")}>
                          {selected ? selected.name : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {branchOptions.map((branch) => (
                          <SelectItem key={branch.publicId} value={branch.publicId}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </FormField>
            <FormField
              htmlFor="rolePublicId"
              label="Role"
              required
              error={errors.rolePublicId?.message}
            >
              <Controller
                name="rolePublicId"
                control={control}
                render={({ field }) => {
                  const selected = roleOptions.find((role) => role.publicId === field.value);
                  return (
                    <Select
                      key={field.value || "role-empty"}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={readOnly || isSubmitting}
                    >
                      <SelectTrigger
                        id="rolePublicId"
                        aria-invalid={errors.rolePublicId ? true : undefined}
                      >
                        <SelectValue placeholder={selectPlaceholder("role")}>
                          {selected ? selected.name : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.publicId} value={role.publicId}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
