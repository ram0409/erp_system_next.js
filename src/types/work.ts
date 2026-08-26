import type { ProjectStatus, TaskStatus } from "@/constants/status";
import type { AttendanceEmployee } from "@/types/hr";

export interface ProjectOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface TaskOption {
  readonly publicId: string;
  readonly title: string;
  readonly project: ProjectOption;
}

export interface ProjectListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly status: ProjectStatus;
  readonly createdAt: string;
  readonly taskCount: number;
  readonly owner: AttendanceEmployee;
}

export interface ProjectDetail extends ProjectListItem {
  readonly updatedAt: string;
}

export interface TaskProjectRef {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface TaskListItem {
  readonly publicId: string;
  readonly title: string;
  readonly description: string | null;
  readonly dueDate: string | null;
  readonly status: TaskStatus;
  readonly createdAt: string;
  readonly worklogCount: number;
  readonly project: TaskProjectRef;
  readonly assignee: AttendanceEmployee | null;
}

export interface TaskDetail extends TaskListItem {
  readonly updatedAt: string;
}

export interface WorklogTaskRef {
  readonly publicId: string;
  readonly title: string;
  readonly project: TaskProjectRef;
}

export interface WorklogListItem {
  readonly publicId: string;
  readonly workDate: string;
  readonly hours: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly task: WorklogTaskRef;
  readonly user: AttendanceEmployee;
}

export interface WorklogDetail extends WorklogListItem {
  readonly updatedAt: string;
}
