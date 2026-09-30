import api, { extractErrorMessage } from "./api";
import type {
  Order,
  OrderListResponse,
  CreateOrderPayload,
  UpdateOrderStatusPayload,
  OrderQueryParams,
} from "./order.types";

export const orderApi = {
  // GET /api/v1/orders?warehouseId=&status=&page=&limit=
  getAll: async (params?: OrderQueryParams): Promise<OrderListResponse> => {
    const { data } = await api.get<OrderListResponse>("/api/v1/orders", {
      params,
    });
    return data;
  },

  // GET /api/v1/orders/:id
  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get<Order>(`/api/v1/orders/${id}`);
    return data;
  },

  // POST /api/v1/orders
  create: async (payload: CreateOrderPayload): Promise<Order> => {
    const { data } = await api.post<Order>("/api/v1/orders", payload);
    return data;
  },

  // PATCH /api/v1/orders/:id/status
  updateStatus: async (
    id: string,
    payload: UpdateOrderStatusPayload
  ): Promise<Order> => {
    const { data } = await api.patch<Order>(
      `/api/v1/orders/${id}/status`,
      payload
    );
    return data;
  },
};

export { extractErrorMessage };
