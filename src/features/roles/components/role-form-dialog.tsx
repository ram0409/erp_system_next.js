"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormDialog } from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createRoleAction, updateRoleAction } from "@/features/roles/actions";
import { normalizeSlug } from "@/lib/normalize";
import type { RoleDetail } from "@/types/role";
import { createRoleSchema, type CreateRoleInput } from "@/validations/role";

const EMPTY_VALUES: CreateRoleInput = {
  name: "",
  slug: "",
  description: "",
};

function valuesFromDetail(detail: RoleDetail): CreateRoleInput {
  return {
    name: detail.name,
    slug: detail.slug,
    description: detail.description ?? "",
  };
}

export type RoleFormMode = "create" | "edit" | "view";

interface RoleFormDialogProps {
  open: boolean;
  mode: RoleFormMode;
  detail: RoleDetail | null;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function RoleFormDialog({
  open,
  mode,
  detail,
  isLoading = false,
  onOpenChange,
  onSuccess,
}: RoleFormDialogProps) {
  const readOnly = mode === "view";
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const formValues = useMemo(
    () => (mode === "create" || !detail ? EMPTY_VALUES : valuesFromDetail(detail)),
    [mode, detail],
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    values: formValues,
  });

  const title = mode === "create" ? "Add role" : mode === "edit" ? "Edit role" : "Role details";

  const onSubmit = handleSubmit(async (values) => {
    if (readOnly) {
      return;
    }
    setFormError(null);

    const result =
      mode === "edit" && detail
        ? await updateRoleAction({
            publicId: detail.publicId,
            name: values.name,
            description: values.description,
          })
        : await createRoleAction(values);

    if (!result.success) {
      if (result.errors.length > 0) {
        for (const fieldError of result.errors) {
          if (fieldError.field && fieldError.field !== "root") {
            setError(fieldError.field as keyof CreateRoleInput, {
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
          setSlugTouched(false);
        }
        onOpenChange(next);
      }}
      title={title}
      description={
        mode === "create"
          ? "Add a role. The slug is a stable identifier and cannot be changed later."
          : mode === "edit"
            ? "The display name can change; the slug stays as the identifier used by code and seeds."
            : undefined
      }
      size="md"
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
            form="role-form"
            isSubmitting={isSubmitting || isLoading}
            submitLabel={mode === "create" ? "Create role" : "Save changes"}
            onCancel={() => onOpenChange(false)}
            disableSubmit={mode === "edit" && !isDirty}
          />
        )
      }
    >
      {isLoading && mode !== "create" && !detail ? (
        <p className="text-muted-foreground text-sm">Loading role…</p>
      ) : (
        <form id="role-form" onSubmit={onSubmit} className="space-y-6" noValidate>
          {formError ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/8 text-destructive rounded-xl border px-3 py-2 text-sm"
            >
              {formError}
            </div>
          ) : null}

          <FormSection>
            <FormField htmlFor="name" label="Name" required error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="off"
                placeholder="Enter the role name"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name", {
                  onChange: (event) => {
                    if (mode === "create" && !slugTouched) {
                      setValue("slug", normalizeSlug(event.target.value), {
                        shouldValidate: false,
                      });
                    }
                  },
                })}
              />
            </FormField>
            <FormField
              htmlFor="slug"
              label="Slug"
              required
              error={errors.slug?.message}
              hint={
                mode === "create"
                  ? "Lowercase letters, numbers and underscores. Locked after create."
                  : "The slug cannot be changed."
              }
            >
              <Input
                id="slug"
                autoComplete="off"
                placeholder="Enter the slug"
                disabled={readOnly || isSubmitting || mode !== "create"}
                aria-invalid={errors.slug ? true : undefined}
                aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
                {...register("slug", {
                  onChange: () => {
                    setSlugTouched(true);
                  },
                })}
              />
            </FormField>
            <FormField
              htmlFor="description"
              label="Description"
              error={errors.description?.message}
              fullWidth
            >
              <Textarea
                id="description"
                placeholder="Enter the description"
                disabled={readOnly || isSubmitting}
                aria-invalid={errors.description ? true : undefined}
                {...register("description")}
              />
            </FormField>
          </FormSection>
        </form>
      )}
    </FormDialog>
  );
}
