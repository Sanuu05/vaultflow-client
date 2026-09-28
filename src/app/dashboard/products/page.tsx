"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  Tag,
  FileText,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { productApi, extractErrorMessage } from "@/lib/product.api";
import type { Product } from "@/lib/product.types";

const LIMIT = 10;

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const productSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(100, "SKU too long")
    .regex(/^[A-Z0-9_-]+$/i, "SKU: letters, numbers, - and _ only"),
  name: z.string().min(1, "Product name is required").max(255, "Name too long"),
  description: z.string().max(2000, "Description too long").optional().or(z.literal("")),
  // Use coerce.number so the input string is cast to a real number before validation
  price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be greater than zero")
    .multipleOf(0.01, "Max 2 decimal places"),
  reorderLevel: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .optional(),
});

// price typed as string|number — Prisma Decimal serializes as string over JSON
type ProductFormData = z.infer<typeof productSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a price value that may be:
 *  - a JS number     (ideal, when toJSON works)
 *  - a string        (Prisma Decimal serialized as string)
 *  - a Decimal.js object {s, e, d} (when toJSON override doesn't fire)
 */
function parseDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value !== null && typeof value === 'object') {
    const d = value as { s: number; e: number; d: number[] };
    if (Array.isArray(d.d) && d.e !== undefined) {
      // Reconstruct from Decimal.js internal: first group is un-padded, rest are 7-digit padded
      const digits = d.d
        .map((n, i) => (i === 0 ? String(n) : String(n).padStart(7, '0')))
        .join('');
      const intLen = d.e + 1;
      const numStr =
        intLen >= digits.length
          ? digits.padEnd(intLen, '0')
          : digits.slice(0, intLen) + '.' + digits.slice(intLen);
      return d.s * parseFloat(numStr);
    }
  }
  return NaN;
}

const fmt = (price: unknown) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(parseDecimal(price));

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton" style={{ height: 14, width: "50%" }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 70, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 50, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 70, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  product,
  onClose,
  onDeleted,
}: {
  product: Product;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await productApi.delete(product.id);
      onDeleted(product.id);
      toast.success(`"${product.name}" deleted`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--color-error)" />
            Delete Product
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Are you sure you want to delete{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{product.name}</strong>{" "}
            <span className="table-code" style={{ fontSize: "0.8rem" }}>{product.sku}</span>?
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-error)", marginTop: "0.75rem" }}>
            This will also remove all associated inventory records and cannot be undone.
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
            {loading ? <><span className="btn-spinner" /> Deleting…</> : <><Trash2 size={15} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({
  mode,
  product,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  product?: Product;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: product?.sku ?? "",
      name: product?.name ?? "",
      description: product?.description ?? "",
      // Coerce to number — API returns Prisma Decimal as a string or {s,e,d} object
      price: product?.price !== undefined ? parseDecimal(product.price) : (undefined as unknown as number),
      reorderLevel: product?.reorderLevel ?? 10,
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        sku: data.sku.toUpperCase(),
        name: data.name,
        description: data.description || undefined,
        // Round to 2dp to avoid floating-point imprecision (e.g. 299.99 → 29999 / 100)
        price: Math.round(data.price * 100) / 100,
        reorderLevel: data.reorderLevel ?? undefined,
      };

      const saved =
        mode === "create"
          ? await productApi.create(payload)
          : await productApi.update(product!.id, payload);

      onSaved(saved);
      toast.success(
        mode === "create" ? `"${saved.name}" added to catalog!` : `"${saved.name}" updated!`
      );
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
          <span className="modal-title">
            {mode === "create" ? "Add Product" : "Edit Product"}
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom: "1rem" }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}

          <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* 2-col grid for SKU + Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.875rem" }}>
              {/* SKU */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="p-sku">SKU <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Tag size={14} /></span>
                  <input
                    id="p-sku"
                    type="text"
                    className={`form-input${errors.sku ? " error" : ""}`}
                    placeholder="PROD-001"
                    autoFocus
                    style={{ textTransform: "uppercase" }}
                    {...register("sku")}
                  />
                </div>
                {errors.sku && <p className="form-error"><AlertCircle size={12} />{errors.sku.message}</p>}
              </div>

              {/* Name */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="p-name">Product name <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Package size={14} /></span>
                  <input
                    id="p-name"
                    type="text"
                    className={`form-input${errors.name ? " error" : ""}`}
                    placeholder="Blue Denim Jacket"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="form-error"><AlertCircle size={12} />{errors.name.message}</p>}
              </div>
            </div>

            <div style={{ marginTop: "0.875rem" }} />

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="p-desc">
                Description{" "}
                <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ top: "1rem", transform: "none" }}>
                  <FileText size={14} />
                </span>
                <textarea
                  id="p-desc"
                  className="form-input"
                  placeholder="Brief description of the product…"
                  rows={2}
                  style={{ paddingTop: "0.75rem", resize: "none" }}
                  {...register("description")}
                />
              </div>
              {errors.description && <p className="form-error"><AlertCircle size={12} />{errors.description.message}</p>}
            </div>

            {/* Price + Reorder Level */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="p-price">Price (₹) <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><IndianRupee size={14} /></span>
                  <input
                    id="p-price"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input${errors.price ? " error" : ""}`}
                    placeholder="299.99"
                    {...register("price")}
                  />
                </div>
                {errors.price && <p className="form-error"><AlertCircle size={12} />{errors.price.message}</p>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="p-reorder">
                  Reorder level{" "}
                  <span style={{ color: "var(--color-text-muted)" }}>(units)</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><AlertTriangle size={14} /></span>
                  <input
                    id="p-reorder"
                    type="number"
                    min="0"
                    step="1"
                    className={`form-input${errors.reorderLevel ? " error" : ""}`}
                    placeholder="10"
                    {...register("reorderLevel")}
                  />
                </div>
                {errors.reorderLevel && <p className="form-error"><AlertCircle size={12} />{errors.reorderLevel.message}</p>}
                <p className="form-hint">Alert when stock drops below this</p>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: "auto", padding: "0.75rem 1.25rem" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            className="btn btn-primary"
            disabled={loading || (mode === "edit" && !isDirty)}
          >
            {loading
              ? <><span className="btn-spinner" />{mode === "create" ? "Adding…" : "Saving…"}</>
              : mode === "create" ? "Add Product" : "Save Changes"}
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
        Showing {from}–{to} of {total} products
      </span>
      <div style={{ display: "flex", gap: "0.375rem" }}>
        <button
          className="icon-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          style={{ opacity: page <= 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          // Show pages around current
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
        <button
          className="icon-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          style={{ opacity: page >= totalPages ? 0.4 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Products Page ────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Debounce the search input
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
      });
      setProducts(res.items);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  // Handlers
  const openCreate = () => { setEditTarget(null); setModalMode("create"); };
  const openEdit = (p: Product) => { setEditTarget(p); setModalMode("edit"); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSaved = (saved: Product) => {
    if (modalMode === "create") {
      fetchProducts(); // re-fetch to keep pagination correct
    } else {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    }
    closeModal();
  };

  const handleDeleted = (id: string) => {
    setDeleteTarget(null);
    fetchProducts();
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
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Products</h1>
            <p>Manage your product catalog — SKUs, pricing, and reorder thresholds</p>
          </div>
          <button
            id="add-product-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={openCreate}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet"><Package size={20} /></div>
            <div>
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{meta.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan"><ArrowUpDown size={20} /></div>
            <div>
              <div className="stat-label">This Page</div>
              <div className="stat-value">{products.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-amber"><AlertTriangle size={20} /></div>
            <div>
              <div className="stat-label">Low Stock SKUs</div>
              <div className="stat-value" style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>
                —
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              Product Catalog{" "}
              {!loading && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8125rem" }}>
                  ({meta.total})
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button className="icon-btn" onClick={fetchProducts} title="Refresh" style={{ width: 36, height: 36 }}>
                <RefreshCw size={15} />
              </button>
              <div className="table-search">
                <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                <input
                  id="product-search"
                  type="text"
                  placeholder="Search name or SKU…"
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
                  <th>Description</th>
                  <th>Price</th>
                  <th>Reorder at</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon"><Package size={28} /></div>
                        <h3>{debouncedSearch ? "No products found" : "No products yet"}</h3>
                        <p>
                          {debouncedSearch
                            ? `Nothing matched "${debouncedSearch}"`
                            : "Add your first product to start tracking inventory."}
                        </p>
                        {!debouncedSearch && (
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
                            onClick={openCreate}
                          >
                            <Plus size={15} /> Add First Product
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: "rgba(124,58,237,0.08)",
                              border: "1px solid rgba(124,58,237,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Package size={15} color="var(--color-violet-400)" />
                          </div>
                          <span style={{ fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td><span className="table-code">{p.sku}</span></td>

                      {/* Description */}
                      <td style={{ color: "var(--color-text-secondary)", maxWidth: 200 }}>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 200,
                          }}
                          title={p.description ?? undefined}
                        >
                          {p.description || (
                            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {fmt(p.price)}
                      </td>

                      {/* Reorder level */}
                      <td>
                        <span
                          style={{
                            fontSize: "0.8125rem",
                            color: p.reorderLevel > 0 ? "var(--color-warning)" : "var(--color-text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {p.reorderLevel > 0 && <AlertTriangle size={12} />}
                          {p.reorderLevel} units
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(p)}
                            title="Edit"
                            id={`edit-product-${p.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => setDeleteTarget(p)}
                            title="Delete"
                            id={`delete-product-${p.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      {/* Create / Edit Modal */}
      {modalMode && (
        <ProductModal
          mode={modalMode}
          product={editTarget ?? undefined}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
