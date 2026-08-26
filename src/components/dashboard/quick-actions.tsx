import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarOffIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  UserPlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import type { DashboardCapabilities } from "@/types/dashboard";

interface DashboardQuickActionsProps {
  readonly capabilities: DashboardCapabilities;
}

interface QuickAction {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly show: boolean;
}

export function DashboardQuickActions({ capabilities }: DashboardQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      href: ROUTES.EMPLOYEES,
      label: "Add employee",
      icon: UserPlusIcon,
      show: capabilities.employees.create,
    },
    {
      href: ROUTES.ATTENDANCE,
      label: "Attendance",
      icon: ClipboardCheckIcon,
      show: capabilities.attendance.view,
    },
    {
      href: ROUTES.LEAVE,
      label: "Leave",
      icon: CalendarOffIcon,
      show: capabilities.leave.view,
    },
    {
      href: ROUTES.PROJECTS,
      label: "Projects",
      icon: FolderKanbanIcon,
      show: capabilities.projects.view,
    },
    {
      href: ROUTES.TASKS,
      label: "Tasks",
      icon: ListTodoIcon,
      show: capabilities.tasks.view,
    },
  ].filter((action) => action.show);

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.href} variant="outline" size="sm" asChild>
          <Link href={action.href}>
            <action.icon />
            {action.label}
          </Link>
        </Button>
      ))}
    </section>
  );
}
