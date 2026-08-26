"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAction, updateUserAction } from "@/features/users/actions";
import type { UserBranchOption, UserDetail, UserRoleOption } from "@/types/user";
import { createUserSchema, updateUserSchema, type CreateUserInput } from "@/validations/user";

const EMPTY_VALUES: CreateUserInput = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  departmentPublicId: "",
  designationPublicId: "",
  joinDate: "",
  branchPublicId: "",
  rolePublicId: "",
  password: "",
  confirmPassword: "",
  mustChangePassword: true,
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
    departmentPublicId: detail.department?.publicId ?? "",
    designationPublicId: detail.jobTitle?.publicId ?? "",
    joinDate: detail.joinDate ? detail.joinDate.slice(0, 10) : "",
    branchPublicId: detail.branch.publicId.trim(),
    rolePublicId: detail.role.publicId.trim(),
    mustChangePassword: detail.mustChangePassword,
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
  departments: readonly UserBranchOption[];
  designations: readonly UserBranchOption[];
  actorIsSuperAdmin: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function UserFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  branches,
  roles,
  departments,
  designations,
  actorIsSuperAdmin,
  onOpenChange,
  onSuccess,
}: UserFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formValues = useMemo(
    () => (mode === "create" || !detail ? EMPTY_VALUES : valuesFromDetail(detail)),
    [mode, detail],
  );

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
    const visible = actorIsSuperAdmin ? [...roles] : roles.filter((role) => !role.isSuperAdmin);
    if (detail && !visible.some((role) => role.publicId === detail.role.publicId)) {
      visible.push({
        publicId: detail.role.publicId,
        name: `${detail.role.name}${detail.role.status !== "ACTIVE" ? " (inactive)" : ""}`,
        slug: detail.role.slug,
        isSuperAdmin: detail.role.isSuperAdmin,
      });
    }
    return visible;
  }, [actorIsSuperAdmin, detail, roles]);

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
            departmentPublicId: values.departmentPublicId,
            designationPublicId: values.designationPublicId,
            joinDate: values.joinDate,
            branchPublicId: values.branchPublicId,
            rolePublicId: values.rolePublicId,
          })
        : await createUserAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        for (const fieldError of result.errors) {
          if (fieldError.field && fieldError.field !== "root") {
            setError(fieldError.field as keyof CreateUserInput, {
              type: "server",
              message: fieldError.message,
            });
          }
        }
      }
      setFormError(result.message);
      return;
    }

    onSuccess(result.message);
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFormError(null);
          setShowPassword(false);
          setShowConfirmPassword(false);
        }
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create"
          ? "The temporary password is never stored in plain text. Ask the person to sign in and change it."
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
                placeholder="Enter the employee code"
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
                placeholder="Enter the email"
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
                placeholder="Enter the first name"
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
                placeholder="Enter the last name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.lastName ? true : undefined}
                {...register("lastName")}
              />
            </FormField>
            <FormField htmlFor="phone" label="Phone" error={errors.phone?.message}>
              <Input
                id="phone"
                autoComplete="off"
                placeholder="Enter the phone number"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.phone ? true : undefined}
                {...register("phone")}
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
            <FormField
              htmlFor="departmentPublicId"
              label="Department"
              error={errors.departmentPublicId?.message}
            >
              <Controller
                name="departmentPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger id="departmentPublicId">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.publicId} value={department.publicId}>
                          {department.code} · {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              htmlFor="designationPublicId"
              label="Designation"
              error={errors.designationPublicId?.message}
            >
              <Controller
                name="designationPublicId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value && field.value.length > 0 ? field.value : "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                    disabled={readOnly || isSubmitting}
                  >
                    <SelectTrigger id="designationPublicId">
                      <SelectValue placeholder="Select a designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {designations.map((item) => (
                        <SelectItem key={item.publicId} value={item.publicId}>
                          {item.code} · {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                        <SelectValue placeholder="Select branch">
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
                        <SelectValue placeholder="Select role">
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

          {mode === "create" ? (
            <FormSection title="Temporary password">
              <FormField
                htmlFor="password"
                label="Password"
                required
                error={errors.password?.message}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter the password"
                    className="pr-11"
                    disabled={isSubmitting}
                    aria-invalid={errors.password ? true : undefined}
                    {...register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0.5 size-9 -translate-y-1/2"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </FormField>
              <FormField
                htmlFor="confirmPassword"
                label="Confirm password"
                required
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm the password"
                    className="pr-11"
                    disabled={isSubmitting}
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    {...register("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0.5 size-9 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={
                      showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                    }
                    aria-pressed={showConfirmPassword}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </FormField>
              <div className="flex items-start gap-2 sm:col-span-2">
                <Controller
                  name="mustChangePassword"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="mustChangePassword"
                      checked={field.value}
                      onCheckedChange={(value) => field.onChange(value === true)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                  )}
                />
                <div className="space-y-0.5">
                  <label htmlFor="mustChangePassword" className="text-sm font-medium">
                    Require password change at first sign-in
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Recommended for accounts created by an administrator.
                  </p>
                </div>
              </div>
            </FormSection>
          ) : null}
        </form>
      )}
    </FormDialog>
  );
}
