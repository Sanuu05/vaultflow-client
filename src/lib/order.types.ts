// ─── Order Types ──────────────────────────────────────────────────────────────

export type OrderStatus =
  | "RESERVED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderProduct {
  id: string;
  name: string;
  sku: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  product: OrderProduct;
}

export interface OrderWarehouse {
  id: string;
  name: string;
  code: string;
}

export interface OrderUser {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  organizationId: string;
  warehouseId: string;
  userId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  totalAmount: number | string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  warehouse: OrderWarehouse;
  items: OrderItem[];
  createdByUser?: OrderUser;
}

export interface OrderListResponse {
  items: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderPayload {
  warehouseId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  totalAmount: number;
  items: CreateOrderItemPayload[];
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

export interface OrderQueryParams {
  warehouseId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}
