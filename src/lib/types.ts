// ==========================================
// VaultFlow API Types
// ==========================================

export type UserRole = "OWNER" | "ADMIN" | "WAREHOUSE_STAFF";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

// ---- Request payloads ----

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
}

export interface CreateUserPayload {
  organizationId: string;
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface LoginPayload {
  organizationId: string;
  email: string;
  password: string;
}

// ---- API error shape ----

export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode?: number;
}
