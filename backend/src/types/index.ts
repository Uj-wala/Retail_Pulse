export interface AuthenticatedUser {
  id: string;
  companyId: string;
  email: string;
  role: import("@prisma/client").UserRole;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
