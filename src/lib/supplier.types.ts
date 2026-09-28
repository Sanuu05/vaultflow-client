// ─── Supplier ─────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse {
  items: Supplier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSupplierPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SupplierQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}
