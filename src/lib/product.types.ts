// ─── Product ──────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number | string; // Prisma Decimal serializes as string over the wire
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  description?: string;
  price: number;
  reorderLevel?: number;
}

export interface UpdateProductPayload {
  sku?: string;
  name?: string;
  description?: string;
  price?: number;
  reorderLevel?: number;
}

export interface ProductQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}
