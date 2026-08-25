import type { SortDirection } from "@/constants/pagination";

/** Normalized, already-validated listing query. Repositories receive only this. */
export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
  readonly skip: number;
  readonly take: number;
}

export interface SortParams<TField extends string = string> {
  readonly sortBy: TField;
  readonly sortDir: SortDirection;
}

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasPreviousPage: boolean;
  readonly hasNextPage: boolean;
}

export interface PaginatedResult<TItem> {
  readonly items: readonly TItem[];
  readonly meta: PaginationMeta;
}

/** Shape of `searchParams` as delivered by the App Router. */
export type RawSearchParams = Record<string, string | string[] | undefined>;
