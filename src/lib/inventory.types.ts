// ─── Inventory Types ──────────────────────────────────────────────────────────

export interface InventoryWarehouse {
  id: string;
  name: string;
  code: string;
}

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  price: number | string; // Prisma Decimal serializes as string over the wire
  reorderLevel: number;
}

export interface InventoryItem {
  id: string;
  organizationId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt: string;
  warehouse: InventoryWarehouse;
  product: InventoryProduct;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateInventoryPayload {
  warehouseId: string;
  productId: string;
  quantity?: number;
}

export interface UpdateInventoryPayload {
  quantity?: number;
  reservedQuantity?: number;
}

export interface InventoryQueryParams {
  warehouseId?: string;
  productId?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}
