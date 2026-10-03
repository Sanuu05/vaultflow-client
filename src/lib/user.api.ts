import api, { extractErrorMessage } from "./api";
import type { UserResponse, CreateUserPayload, UserRole } from "./types";

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}

export const userManagementApi = {
  // GET /api/v1/user?organizationId=<id>
  getAll: async (organizationId: string): Promise<UserResponse[]> => {
    const { data } = await api.get<UserResponse[]>("/api/v1/user", {
      params: { organizationId },
    });
    return data;
  },

  // GET /api/v1/user/:id
  getById: async (id: string): Promise<UserResponse> => {
    const { data } = await api.get<UserResponse>(`/api/v1/user/${id}`);
    return data;
  },

  // POST /api/v1/user  — create a new team member
  create: async (payload: CreateUserPayload): Promise<UserResponse> => {
    const { data } = await api.post<UserResponse>("/api/v1/user", payload);
    return data;
  },

  // PATCH /api/v1/user/:id
  update: async (id: string, payload: UpdateUserPayload): Promise<UserResponse> => {
    const { data } = await api.patch<UserResponse>(`/api/v1/user/${id}`, payload);
    return data;
  },

  // DELETE /api/v1/user/:id  → 204 No Content
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/user/${id}`);
  },
};

export { extractErrorMessage };
