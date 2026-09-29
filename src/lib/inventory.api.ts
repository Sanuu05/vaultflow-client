import api, { extractErrorMessage } from "./api";
import type {
  InventoryItem,
  InventoryListResponse,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  InventoryQueryParams,
} from "./inventory.types";

export const inventoryApi = {
  // GET /api/v1/inventory
  getAll: async (params?: InventoryQueryParams): Promise<InventoryListResponse> => {
    const { data } = await api.get<InventoryListResponse>("/api/v1/inventory", { params });
    return data;
  },

  // GET /api/v1/inventory/:id
  getById: async (id: string): Promise<InventoryItem> => {
    const { data } = await api.get<InventoryItem>(`/api/v1/inventory/${id}`);
    return data;
  },

  // POST /api/v1/inventory
  create: async (payload: CreateInventoryPayload): Promise<InventoryItem> => {
    const { data } = await api.post<InventoryItem>("/api/v1/inventory", payload);
    return data;
  },

  // PATCH /api/v1/inventory/:id
  update: async (id: string, payload: UpdateInventoryPayload): Promise<InventoryItem> => {
    const { data } = await api.patch<InventoryItem>(`/api/v1/inventory/${id}`, payload);
    return data;
  },

  // DELETE /api/v1/inventory/:id  → 204 No Content
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/inventory/${id}`);
  },
};

export { extractErrorMessage };
