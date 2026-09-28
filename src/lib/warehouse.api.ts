import api, { extractErrorMessage } from "./api";
import type {
  Warehouse,
  CreateWarehousePayload,
  UpdateWarehousePayload,
} from "./warehouse.types";

export const warehouseApi = {
  // GET /api/v1/warehouse  — all warehouses for the authed org
  getAll: async (): Promise<Warehouse[]> => {
    const { data } = await api.get<Warehouse[]>("/api/v1/warehouse");
    return data;
  },

  // GET /api/v1/warehouse/:id
  getById: async (id: string): Promise<Warehouse> => {
    const { data } = await api.get<Warehouse>(`/api/v1/warehouse/${id}`);
    return data;
  },

  // POST /api/v1/warehouse
  create: async (payload: CreateWarehousePayload): Promise<Warehouse> => {
    const { data } = await api.post<Warehouse>("/api/v1/warehouse", payload);
    return data;
  },

  // PATCH /api/v1/warehouse/:id
  update: async (
    id: string,
    payload: UpdateWarehousePayload
  ): Promise<Warehouse> => {
    const { data } = await api.patch<Warehouse>(
      `/api/v1/warehouse/${id}`,
      payload
    );
    return data;
  },
};

export { extractErrorMessage };
