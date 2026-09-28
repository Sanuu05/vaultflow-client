"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Truck,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supplierApi, extractErrorMessage } from "@/lib/supplier.api";
import type { Supplier } from "@/lib/supplier.types";

const LIMIT = 10;

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255, "Name too long"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50, "Phone too long").optional().or(z.literal("")),
  address: z.string().max(1000, "Address too long").optional().or(z.literal("")),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton" style={{ height: 14, width: "55%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "70%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 90 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "60%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 70, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  supplier,
  onClose,
  onDeleted,
}: {
  supplier: Supplier;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await supplierApi.delete(supplier.id);
      onDeleted(supplier.id);
      toast.success(`"${supplier.name}" removed`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--color-error)" />
            Remove Supplier
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Are you sure you want to remove{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>{supplier.name}</strong>?
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-error)", marginTop: "0.75rem" }}>
            This will also remove all associated purchase orders and cannot be undone.
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

// ─── Supplier Form Modal ───────────────────────────────────────────────────────

function SupplierModal({
  mode,
  supplier,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  supplier?: Supplier;
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      email: supplier?.email ?? "",
      phone: supplier?.phone ?? "",
      address: supplier?.address ?? "",
    },
  });

  const onSubmit = async (data: SupplierFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      };

      const saved =
        mode === "create"
          ? await supplierApi.create(payload)
          : await supplierApi.update(supplier!.id, payload);

      onSaved(saved);
      toast.success(
        mode === "create" ? `"${saved.name}" added!` : `"${saved.name}" updated!`
      );
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">
            {mode === "create" ? "Add Supplier" : "Edit Supplier"}
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

          <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="s-name">
                Supplier name <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={15} /></span>
                <input
                  id="s-name"
                  type="text"
                  className={`form-input${errors.name ? " error" : ""}`}
                  placeholder="Acme Supplies Ltd."
                  autoFocus
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="form-error"><AlertCircle size={12} />{errors.name.message}</p>
              )}
            </div>

            {/* Email + Phone — 2 col */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="s-email">
                  Email{" "}
                  <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input
                    id="s-email"
                    type="email"
                    className={`form-input${errors.email ? " error" : ""}`}
                    placeholder="vendor@acme.com"
                    autoComplete="off"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="form-error"><AlertCircle size={12} />{errors.email.message}</p>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="s-phone">
                  Phone{" "}
                  <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Phone size={15} /></span>
                  <input
                    id="s-phone"
                    type="tel"
                    className={`form-input${errors.phone ? " error" : ""}`}
                    placeholder="+91 98765 43210"
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="form-error"><AlertCircle size={12} />{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div style={{ marginTop: "0.875rem" }} />

            {/* Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="s-address">
                Address{" "}
                <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ top: "1rem", transform: "none" }}>
                  <MapPin size={15} />
                </span>
                <textarea
                  id="s-address"
                  className="form-input"
                  placeholder="Plot 42, Industrial Area, Mumbai, MH 400001"
                  rows={2}
                  style={{ paddingTop: "0.75rem", resize: "none" }}
                  {...register("address")}
                />
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
            form="supplier-form"
            className="btn btn-primary"
            disabled={loading || (mode === "edit" && !isDirty)}
          >
            {loading
              ? <><span className="btn-spinner" />{mode === "create" ? "Adding…" : "Saving…"}</>
              : mode === "create" ? "Add Supplier" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination (reusable) ─────────────────────────────────────────────────────

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
        Showing {from}–{to} of {total} suppliers
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

// ─── Avatar initials ───────────────────────────────────────────────────────────

function SupplierAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Deterministic hue from name
  const hue = name
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        background: `hsla(${hue}, 60%, 35%, 0.25)`,
        border: `1px solid hsla(${hue}, 60%, 55%, 0.2)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 700,
        fontSize: "0.75rem",
        color: `hsla(${hue}, 80%, 70%, 1)`,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Main Suppliers Page ───────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierApi.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
      });
      setSuppliers(res.items);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (user) fetchSuppliers();
  }, [user, fetchSuppliers]);

  const openCreate = () => { setEditTarget(null); setModalMode("create"); };
  const openEdit = (s: Supplier) => { setEditTarget(s); setModalMode("edit"); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSaved = (saved: Supplier) => {
    if (modalMode === "create") {
      fetchSuppliers();
    } else {
      setSuppliers((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    }
    closeModal();
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    fetchSuppliers();
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
            <h1>Suppliers</h1>
            <p>Manage your vendors and suppliers for purchase orders</p>
          </div>
          <button
            id="add-supplier-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={openCreate}
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet"><Truck size={20} /></div>
            <div>
              <div className="stat-label">Total Suppliers</div>
              <div className="stat-value">{meta.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan">
              <Mail size={20} />
            </div>
            <div>
              <div className="stat-label">With Email</div>
              <div className="stat-value">
                {suppliers.filter((s) => s.email).length}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <Phone size={20} />
            </div>
            <div>
              <div className="stat-label">With Phone</div>
              <div className="stat-value">
                {suppliers.filter((s) => s.phone).length}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              All Suppliers{" "}
              {!loading && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8125rem" }}>
                  ({meta.total})
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className="icon-btn"
                onClick={fetchSuppliers}
                title="Refresh"
                style={{ width: 36, height: 36 }}
              >
                <RefreshCw size={15} />
              </button>
              <div className="table-search">
                <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                <input
                  id="supplier-search"
                  type="text"
                  placeholder="Search name, email, phone…"
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
                  <th>Supplier</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon"><Truck size={28} /></div>
                        <h3>
                          {debouncedSearch ? "No suppliers found" : "No suppliers yet"}
                        </h3>
                        <p>
                          {debouncedSearch
                            ? `Nothing matched "${debouncedSearch}"`
                            : "Add your first supplier to manage purchase orders."}
                        </p>
                        {!debouncedSearch && (
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
                            onClick={openCreate}
                          >
                            <Plus size={15} /> Add First Supplier
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <SupplierAvatar name={s.name} />
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        {s.email ? (
                          <a
                            href={`mailto:${s.email}`}
                            style={{
                              color: "var(--color-cyan-400)",
                              textDecoration: "none",
                              fontSize: "0.875rem",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {s.email}
                            <ExternalLink size={11} style={{ opacity: 0.5 }} />
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        {s.phone ? (
                          <a
                            href={`tel:${s.phone}`}
                            style={{
                              color: "var(--color-text-secondary)",
                              textDecoration: "none",
                              fontSize: "0.875rem",
                            }}
                          >
                            {s.phone}
                          </a>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 200,
                            fontSize: "0.875rem",
                          }}
                          title={s.address ?? undefined}
                        >
                          {s.address ? (
                            <>
                              <MapPin size={12} style={{ marginRight: 4, opacity: 0.6, verticalAlign: "middle" }} />
                              {s.address}
                            </>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(s)}
                            title="Edit supplier"
                            id={`edit-supplier-${s.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => setDeleteTarget(s)}
                            title="Remove supplier"
                            id={`delete-supplier-${s.id}`}
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

      {modalMode && (
        <SupplierModal
          mode={modalMode}
          supplier={editTarget ?? undefined}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          supplier={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
