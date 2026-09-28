import axios, { AxiosError } from "axios";
import type {
  Organization,
  AuthResponse,
  CreateOrganizationPayload,
  CreateUserPayload,
  LoginPayload,
  UserResponse,
  ApiError,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request (client-side only)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("vaultflow_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Normalize error messages from NestJS
export function extractErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiError>;
  const data = axiosErr?.response?.data;
  if (!data) return "An unexpected error occurred.";
  const msg = data.message;
  if (Array.isArray(msg)) return msg[0];
  return msg || data.error || "Something went wrong.";
}

// ==========================================
// Organizations
// ==========================================
export const organizationApi = {
  create: async (payload: CreateOrganizationPayload): Promise<Organization> => {
    const { data } = await api.post<Organization>(
      "/api/v1/organizations",
      payload
    );
    return data;
  },

  // Resolve a human-readable slug → full org object (used by login step 1)
  resolveSlug: async (slug: string): Promise<Organization> => {
    const { data } = await api.get<Organization>(
      `/api/v1/organizations/slug/${encodeURIComponent(slug)}`
    );
    return data;
  },

  getAll: async (): Promise<Organization[]> => {
    const { data } = await api.get<Organization[]>("/api/v1/organizations");
    return data;
  },
};

// ==========================================
// Users / Auth
// ==========================================
export const userApi = {
  register: async (payload: CreateUserPayload): Promise<UserResponse> => {
    const { data } = await api.post<UserResponse>("/api/v1/user", payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>(
      "/api/v1/user/login",
      payload
    );
    return data;
  },

  getProfile: async (): Promise<UserResponse> => {
    const { data } = await api.get<UserResponse>("/api/v1/user/me");
    return data;
  },
};

export default api;
