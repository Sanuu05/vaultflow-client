// ─── Warehouse ────────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehousePayload {
  name: string;
  code: string;
  address?: string;
  isActive?: boolean;
}

export interface UpdateWarehousePayload {
  name?: string;
  code?: string;
  address?: string;
  isActive?: boolean;
}
