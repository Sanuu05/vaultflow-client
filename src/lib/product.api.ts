import api from "./api";
import { extractErrorMessage } from "./api";
import type {
  Product,
  ProductListResponse,
  CreateProductPayload,
  UpdateProductPayload,
  ProductQueryParams,
} from "./product.types";

export const productApi = {
  // GET /api/v1/products?search=&page=&limit=
  getAll: async (params?: ProductQueryParams): Promise<ProductListResponse> => {
    const { data } = await api.get<ProductListResponse>("/api/v1/products", {
      params,
    });
    return data;
  },

  // GET /api/v1/products/:id
  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get<Product>(`/api/v1/products/${id}`);
    return data;
  },

  // POST /api/v1/products
  create: async (payload: CreateProductPayload): Promise<Product> => {
    const { data } = await api.post<Product>("/api/v1/products", payload);
    return data;
  },

  // PATCH /api/v1/products/:id
  update: async (
    id: string,
    payload: UpdateProductPayload
  ): Promise<Product> => {
    const { data } = await api.patch<Product>(
      `/api/v1/products/${id}`,
      payload
    );
    return data;
  },

  // DELETE /api/v1/products/:id  → 204 No Content
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/products/${id}`);
  },
};

export { extractErrorMessage };
