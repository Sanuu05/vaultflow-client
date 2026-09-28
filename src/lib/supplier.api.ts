import api from "./api";
import { extractErrorMessage } from "./api";
import type {
  Supplier,
  SupplierListResponse,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierQueryParams,
} from "./supplier.types";

export const supplierApi = {
  // GET /api/v1/suppliers?search=&page=&limit=
  getAll: async (params?: SupplierQueryParams): Promise<SupplierListResponse> => {
    const { data } = await api.get<SupplierListResponse>("/api/v1/suppliers", {
      params,
    });
    return data;
  },

  // GET /api/v1/suppliers/:id
  getById: async (id: string): Promise<Supplier> => {
    const { data } = await api.get<Supplier>(`/api/v1/suppliers/${id}`);
    return data;
  },

  // POST /api/v1/suppliers
  create: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const { data } = await api.post<Supplier>("/api/v1/suppliers", payload);
    return data;
  },

  // PATCH /api/v1/suppliers/:id
  update: async (
    id: string,
    payload: UpdateSupplierPayload
  ): Promise<Supplier> => {
    const { data } = await api.patch<Supplier>(
      `/api/v1/suppliers/${id}`,
      payload
    );
    return data;
  },

  // DELETE /api/v1/suppliers/:id  → 204 No Content (service returns message)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/suppliers/${id}`);
  },
};

export { extractErrorMessage };
