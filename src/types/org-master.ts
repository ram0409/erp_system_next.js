import type { RecordStatus } from "@/constants/status";

export interface DepartmentListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly userCount: number;
  readonly branch: {
    readonly publicId: string;
    readonly code: string;
    readonly name: string;
  } | null;
}

export interface DepartmentDetail extends DepartmentListItem {
  readonly updatedAt: string;
}

export interface DepartmentOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}

export interface DesignationListItem {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly userCount: number;
}

export interface DesignationDetail extends DesignationListItem {
  readonly updatedAt: string;
}

export interface DesignationOption {
  readonly publicId: string;
  readonly code: string;
  readonly name: string;
}
