"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  TrendingUp,
  Pencil,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Warehouse,
  Package,
  Filter,
  Layers,
  ShieldAlert,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { inventoryApi, extractErrorMessage } from "@/lib/inventory.api";
import { warehouseApi } from "@/lib/warehouse.api";
import { productApi } from "@/lib/product.api";
import type { InventoryItem } from "@/lib/inventory.types";
import type { Warehouse as WarehouseType } from "@/lib/warehouse.types";
import type { Product } from "@/lib/product.types";

const LIMIT = 10;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value !== null && typeof value === "object") {
    const d = value as { s: number; e: number; d: number[] };
    if (Array.isArray(d.d) && d.e !== undefined) {
      const digits = d.d
        .map((n, i) => (i === 0 ? String(n) : String(n).padStart(7, "0")))
        .join("");
      const intLen = d.e + 1;
      const numStr =
        intLen >= digits.length
          ? digits.padEnd(intLen, "0")
          : digits.slice(0, intLen) + "." + digits.slice(intLen);
      return d.s * parseFloat(numStr);
    }
  }
  return NaN;
}

const fmt = (price: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(parseDecimal(price));

function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.product.reorderLevel;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  productId: z.string().uuid("Select a product"),
  quantity: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .optional(),
});

const updateSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  reservedQuantity: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
});

type CreateFormData = z.infer<typeof createSchema>;
type UpdateFormData = z.infer<typeof updateSchema>;

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton" style={{ height: 14, width: "60%" }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 70, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 80, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 60 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 60 }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 70, borderRadius: 12 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 70, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  item,
  onClose,
  onDeleted,
}: {
  item: InventoryItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await inventoryApi.delete(item.id);
      onDeleted(item.id);
      toast.success(`Inventory entry removed`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--color-error)" />
            Remove Inventory Entry
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Remove{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{item.product.name}</strong>{" "}
            <span className="table-code" style={{ fontSize: "0.8rem" }}>{item.product.sku}</span>
            {" "}from{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{item.warehouse.name}</strong>?
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-error)", marginTop: "0.75rem" }}>
            This will permanently delete this inventory entry. Stock movements linked to it will be orphaned.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ width: "auto", padding: "0.75rem 1.25rem" }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDelete}
            disabled={loading}
            style={{ background: "var(--color-error)", boxShadow: "0 4px 20px rgba(239,68,68,0.3)" }}
          >
            {loading ? <><span className="btn-spinner" /> Removing…</> : <><Trash2 size={15} /> Remove</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  warehouses,
  products,
  onClose,
  onSaved,
}: {
  warehouses: WarehouseType[];
  products: Product[];
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({ resolver: zodResolver(createSchema) });

  const onSubmit = async (data: CreateFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const saved = await inventoryApi.create({
        warehouseId: data.warehouseId,
        productId: data.productId,
        quantity: data.quantity ?? 0,
      });
      onSaved(saved);
      toast.success("Inventory entry created!");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">Add Inventory Entry</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom: "1rem" }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}
          <form id="inventory-create-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Warehouse */}
            <div className="form-group">
              <label className="form-label" htmlFor="inv-warehouse">
                Warehouse <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Warehouse size={14} /></span>
                <select
                  id="inv-warehouse"
                  className={`form-input${errors.warehouseId ? " error" : ""}`}
                  style={{ paddingLeft: "2.5rem", appearance: "none" }}
                  {...register("warehouseId")}
                >
                  <option value="">— Select warehouse —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              {errors.warehouseId && (
                <p className="form-error"><AlertCircle size={12} />{errors.warehouseId.message}</p>
              )}
            </div>

            {/* Product */}
            <div className="form-group">
              <label className="form-label" htmlFor="inv-product">
                Product <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Package size={14} /></span>
                <select
                  id="inv-product"
                  className={`form-input${errors.productId ? " error" : ""}`}
                  style={{ paddingLeft: "2.5rem", appearance: "none" }}
                  {...register("productId")}
                >
                  <option value="">— Select product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.sku}
                    </option>
                  ))}
                </select>
              </div>
              {errors.productId && (
                <p className="form-error"><AlertCircle size={12} />{errors.productId.message}</p>
              )}
            </div>

            {/* Initial Quantity */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="inv-qty">
                Initial quantity{" "}
                <span style={{ color: "var(--color-text-muted)" }}>(units, default 0)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Layers size={14} /></span>
                <input
                  id="inv-qty"
                  type="number"
                  min="0"
                  step="1"
                  className={`form-input${errors.quantity ? " error" : ""}`}
                  placeholder="0"
                  {...register("quantity")}
                />
              </div>
              {errors.quantity && (
                <p className="form-error"><AlertCircle size={12} />{errors.quantity.message}</p>
              )}
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ width: "auto", padding: "0.75rem 1.25rem" }}>
            Cancel
          </button>
          <button type="submit" form="inventory-create-form" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="btn-spinner" /> Creating…</> : <><Plus size={15} /> Add Entry</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: (updated: InventoryItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
    },
  });

  const onSubmit = async (data: UpdateFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const updated = await inventoryApi.update(item.id, {
        quantity: data.quantity,
        reservedQuantity: data.reservedQuantity,
      });
      onSaved(updated);
      toast.success("Inventory updated!");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Adjust Stock</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Context pill */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              marginBottom: "1.25rem",
              padding: "0.875rem 1rem",
              background: "rgba(124,58,237,0.06)",
              borderRadius: 12,
              border: "1px solid rgba(124,58,237,0.12)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {item.product.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                <span className="table-code" style={{ fontSize: "0.75rem" }}>{item.product.sku}</span>
                {" · "}
                <Warehouse size={11} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                {item.warehouse.name}
              </div>
            </div>
          </div>

          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom: "1rem" }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}

          <form id="inventory-edit-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              {/* Quantity */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="edit-qty">
                  On-hand qty <span>*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Layers size={14} /></span>
                  <input
                    id="edit-qty"
                    type="number"
                    min="0"
                    step="1"
                    className={`form-input${errors.quantity ? " error" : ""}`}
                    {...register("quantity")}
                  />
                </div>
                {errors.quantity && (
                  <p className="form-error"><AlertCircle size={12} />{errors.quantity.message}</p>
                )}
              </div>

              {/* Reserved */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="edit-reserved">
                  Reserved qty
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><ShieldAlert size={14} /></span>
                  <input
                    id="edit-reserved"
                    type="number"
                    min="0"
                    step="1"
                    className={`form-input${errors.reservedQuantity ? " error" : ""}`}
                    {...register("reservedQuantity")}
                  />
                </div>
                {errors.reservedQuantity && (
                  <p className="form-error"><AlertCircle size={12} />{errors.reservedQuantity.message}</p>
                )}
                <p className="form-hint">Units held for open orders</p>
              </div>
            </div>

            {/* Reorder level info */}
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1rem",
                background: "rgba(245,158,11,0.06)",
                borderRadius: 10,
                border: "1px solid rgba(245,158,11,0.12)",
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertTriangle size={13} color="var(--color-warning)" />
              Reorder level: <strong style={{ color: "var(--color-warning)" }}>{item.product.reorderLevel} units</strong>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ width: "auto", padding: "0.75rem 1.25rem" }}>
            Cancel
          </button>
          <button
            type="submit"
            form="inventory-edit-form"
            className="btn btn-primary"
            disabled={loading || !isDirty}
          >
            {loading ? <><span className="btn-spinner" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.875rem 1.5rem",
        borderTop: "1px solid var(--color-border)",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}
    >
      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
        Showing {from}–{to} of {total} entries
      </span>
      <div style={{ display: "flex", gap: "0.375rem" }}>
        <button className="icon-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} style={{ opacity: page <= 1 ? 0.4 : 1 }}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p: number;
          if (totalPages <= 7) p = i + 1;
          else if (page <= 4) p = i + 1;
          else if (page >= totalPages - 3) p = totalPages - 6 + i;
          else p = page - 3 + i;
          return (
            <button
              key={p}
              className="icon-btn"
              onClick={() => onChange(p)}
              style={{
                background: p === page ? "rgba(124,58,237,0.15)" : "transparent",
                color: p === page ? "var(--color-violet-400)" : "var(--color-text-secondary)",
                fontWeight: p === page ? 600 : 400,
                fontSize: "0.8125rem",
                width: 32,
                height: 32,
              }}
            >
              {p}
            </button>
          );
        })}
        <button className="icon-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)} style={{ opacity: page >= totalPages ? 0.4 : 1 }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Inventory Page ───────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filter state
  const [filterWarehouse, setFilterWarehouse] = useState<string>("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdowns for create modal
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Stats
  const lowStockCount = items.filter(isLowStock).length;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // Load warehouses & products for create form
  useEffect(() => {
    if (!user) return;
    warehouseApi.getAll().then(setWarehouses).catch(() => {});
    productApi.getAll({ limit: 200 }).then((r) => setProducts(r.items)).catch(() => {});
  }, [user]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAll({
        warehouseId: filterWarehouse || undefined,
        lowStock: filterLowStock || undefined,
        page,
        limit: LIMIT,
      });
      // Client-side name filter
      let filtered = res.items;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.product.name.toLowerCase().includes(q) ||
            i.product.sku.toLowerCase().includes(q) ||
            i.warehouse.name.toLowerCase().includes(q) ||
            i.warehouse.code.toLowerCase().includes(q)
        );
      }
      setItems(filtered);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterWarehouse, filterLowStock, page, debouncedSearch]);

  useEffect(() => {
    if (user) fetchInventory();
  }, [user, fetchInventory]);

  const handleSaved = (saved: InventoryItem) => {
    setCreateOpen(false);
    setEditTarget(null);
    fetchInventory();
  };

  const handleUpdated = (updated: InventoryItem) => {
    setEditTarget(null);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    fetchInventory();
  };

  if (authLoading || !user) return null;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1f2e",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "0.875rem",
          },
        }}
      />

      <div className="dash-content">
        {/* ── Header ── */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Inventory</h1>
            <p>Track stock levels across all warehouses — spot shortages before they happen</p>
          </div>
          <button
            id="add-inventory-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} /> Add Entry
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet"><TrendingUp size={20} /></div>
            <div>
              <div className="stat-label">Total Entries</div>
              <div className="stat-value">{meta.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan"><Layers size={20} /></div>
            <div>
              <div className="stat-label">Units On-Hand</div>
              <div className="stat-value">{totalQty.toLocaleString()}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-amber"><AlertTriangle size={20} /></div>
            <div>
              <div className="stat-label">Low Stock (this page)</div>
              <div
                className="stat-value"
                style={{ color: lowStockCount > 0 ? "var(--color-warning)" : "var(--color-text-primary)" }}
              >
                {lowStockCount}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green"><Warehouse size={20} /></div>
            <div>
              <div className="stat-label">Warehouses</div>
              <div className="stat-value">{warehouses.length}</div>
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              Inventory Ledger{" "}
              {!loading && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8125rem" }}>
                  ({meta.total})
                </span>
              )}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {/* Refresh */}
              <button className="icon-btn" onClick={fetchInventory} title="Refresh" style={{ width: 36, height: 36 }}>
                <RefreshCw size={15} />
              </button>

              {/* Warehouse filter */}
              <div className="input-wrapper" style={{ position: "relative", margin: 0 }}>
                <span style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>
                  <Filter size={13} />
                </span>
                <select
                  id="inv-filter-warehouse"
                  value={filterWarehouse}
                  onChange={(e) => { setFilterWarehouse(e.target.value); setPage(1); }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    color: "var(--color-text-primary)",
                    fontSize: "0.8125rem",
                    padding: "0.5rem 0.875rem 0.5rem 2rem",
                    outline: "none",
                    fontFamily: "Inter, sans-serif",
                    cursor: "pointer",
                    minWidth: 150,
                  }}
                >
                  <option value="">All warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Low stock toggle */}
              <button
                id="inv-filter-lowstock"
                onClick={() => { setFilterLowStock((v) => !v); setPage(1); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.875rem",
                  borderRadius: 10,
                  border: `1px solid ${filterLowStock ? "rgba(245,158,11,0.4)" : "var(--color-border)"}`,
                  background: filterLowStock ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)",
                  color: filterLowStock ? "var(--color-warning)" : "var(--color-text-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  transition: "all 0.2s",
                }}
              >
                <AlertTriangle size={13} />
                Low Stock
              </button>

              {/* Search */}
              <div className="table-search">
                <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                <input
                  id="inventory-search"
                  type="text"
                  placeholder="Search product, SKU, warehouse…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th>On-hand</th>
                  <th>Reserved</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-icon"><TrendingUp size={28} /></div>
                        <h3>
                          {filterLowStock
                            ? "No low-stock items"
                            : debouncedSearch
                            ? "No results found"
                            : "No inventory entries yet"}
                        </h3>
                        <p>
                          {filterLowStock
                            ? "Great — all items are above their reorder levels."
                            : debouncedSearch
                            ? `Nothing matched "${debouncedSearch}"`
                            : "Add your first inventory entry to start tracking stock."}
                        </p>
                        {!debouncedSearch && !filterLowStock && (
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
                            onClick={() => setCreateOpen(true)}
                          >
                            <Plus size={15} /> Add First Entry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const low = isLowStock(item);
                    const available = item.quantity - item.reservedQuantity;
                    return (
                      <tr key={item.id}>
                        {/* Product */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 9,
                                background: low
                                  ? "rgba(245,158,11,0.08)"
                                  : "rgba(124,58,237,0.08)",
                                border: `1px solid ${low ? "rgba(245,158,11,0.2)" : "rgba(124,58,237,0.15)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {low
                                ? <AlertTriangle size={15} color="var(--color-warning)" />
                                : <Package size={15} color="var(--color-violet-400)" />
                              }
                            </div>
                            <span style={{ fontWeight: 500 }}>{item.product.name}</span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td><span className="table-code">{item.product.sku}</span></td>

                        {/* Warehouse */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-text-secondary)" }}>
                            <Warehouse size={13} style={{ flexShrink: 0 }} />
                            {item.warehouse.name}
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>({item.warehouse.code})</span>
                          </div>
                        </td>

                        {/* On-hand qty */}
                        <td>
                          <span
                            style={{
                              fontFamily: "Space Grotesk, sans-serif",
                              fontWeight: 700,
                              fontSize: "1rem",
                              color: low ? "var(--color-warning)" : "var(--color-text-primary)",
                            }}
                          >
                            {item.quantity.toLocaleString()}
                          </span>
                          {available < item.quantity && (
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: 4 }}>
                              ({available} avail)
                            </span>
                          )}
                        </td>

                        {/* Reserved */}
                        <td>
                          <span style={{ fontSize: "0.875rem", color: item.reservedQuantity > 0 ? "var(--color-cyan-400)" : "var(--color-text-muted)" }}>
                            {item.reservedQuantity > 0 ? item.reservedQuantity.toLocaleString() : "—"}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td>
                          {low ? (
                            <span
                              className="badge"
                              style={{
                                background: "rgba(245,158,11,0.1)",
                                color: "var(--color-warning)",
                                border: "1px solid rgba(245,158,11,0.2)",
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-warning)", flexShrink: 0 }} />
                              Low Stock
                            </span>
                          ) : (
                            <span className="badge badge-active">
                              <span className="badge-dot" />
                              In Stock
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              onClick={() => setEditTarget(item)}
                              title="Adjust stock"
                              id={`edit-inv-${item.id}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => setDeleteTarget(item)}
                              title="Remove entry"
                              id={`delete-inv-${item.id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={LIMIT}
            onChange={(p) => setPage(p)}
          />
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <CreateModal
          warehouses={warehouses}
          products={products}
          onClose={() => setCreateOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleUpdated}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
