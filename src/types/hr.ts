import type {
  AttendanceDayStatus,
  HolidayType,
  LeaveStatus,
  LeaveType,
  RecordStatus,
} from "@/constants/status";
import type { EmployeeOption } from "@/types/user";

export type { EmployeeOption };

export interface AttendanceEmployee {
  readonly publicId: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface AttendanceListItem {
  readonly publicId: string;
  readonly workDate: string;
  readonly status: AttendanceDayStatus;
  readonly checkIn: string | null;
  readonly checkOut: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly user: AttendanceEmployee;
}

export interface AttendanceDetail extends AttendanceListItem {
  readonly updatedAt: string;
}

export interface LeaveListItem {
  readonly publicId: string;
  readonly type: LeaveType;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string | null;
  readonly status: LeaveStatus;
  readonly createdAt: string;
  readonly user: AttendanceEmployee;
}

export interface LeaveDetail extends LeaveListItem {
  readonly updatedAt: string;
}

export interface HolidayListItem {
  readonly publicId: string;
  readonly holidayDate: string;
  readonly name: string;
  readonly type: HolidayType;
  readonly notes: string | null;
  readonly status: RecordStatus;
  readonly createdAt: string;
}

export interface HolidayDetail extends HolidayListItem {
  readonly updatedAt: string;
}
