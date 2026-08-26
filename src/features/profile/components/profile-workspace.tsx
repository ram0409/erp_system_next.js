import {
  BadgeCheckIcon,
  Building2Icon,
  HashIcon,
  MailIcon,
  ShieldIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileIdentityCard } from "@/features/profile/components/profile-identity-card";
import type { SessionUser } from "@/types/session";
import { formatFullName } from "@/utils/format";

interface ProfileWorkspaceProps {
  readonly user: SessionUser;
}

export function ProfileWorkspace({ user }: ProfileWorkspaceProps) {
  const fullName = formatFullName(user.firstName, user.lastName);

  return (
    <div className="space-y-5">
      <ProfileIdentityCard user={user} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <p className="text-muted-foreground text-sm">Identity as recorded on your account.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ProfileField icon={UserIcon} label="Name" value={fullName} />
            <ProfileField icon={HashIcon} label="Employee code" value={user.employeeCode} />
            <ProfileField icon={MailIcon} label="Email" value={user.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
            <p className="text-muted-foreground text-sm">Where you work and which role you hold.</p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ProfileField
              icon={Building2Icon}
              label="Branch"
              value={`${user.branch.name} (${user.branch.code})`}
            />
            <ProfileField icon={ShieldIcon} label="Role" value={user.role.name} />
            <div className="border-border/70 bg-surface-muted/80 flex items-center gap-3 rounded-xl border px-4 py-3">
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <BadgeCheckIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="border-border/70 bg-surface-muted/80 flex items-start gap-3 rounded-xl border px-4 py-3">
      <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-foreground mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
