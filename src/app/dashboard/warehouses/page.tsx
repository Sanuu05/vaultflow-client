"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  Pencil,
  MapPin,
  Hash,
  Building2,
  AlertCircle,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { warehouseApi, extractErrorMessage } from "@/lib/warehouse.api";
import type { Warehouse } from "@/lib/warehouse.types";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const warehouseSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name too long"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(50, "Code too long")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, - and _"),
  address: z.string().max(500, "Address too long").optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

// ─── Skeleton Rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton" style={{ height: 14, width: "60%" }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 60, borderRadius: 6 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "80%" }} /></td>
          <td><div className="skeleton" style={{ height: 24, width: 70, borderRadius: 20 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 80, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Warehouse Form Modal ─────────────────────────────────────────────────────

function WarehouseModal({
  mode,
  warehouse,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  warehouse?: Warehouse;
  onClose: () => void;
  onSaved: (w: Warehouse) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name ?? "",
      code: warehouse?.code ?? "",
      address: warehouse?.address ?? "",
      isActive: warehouse?.isActive ?? true,
    },
  });

  const isActiveVal = watch("isActive");

  const onSubmit = async (data: WarehouseFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const payload = {
        name: data.name,
        code: data.code.toUpperCase(),
        address: data.address || undefined,
        isActive: data.isActive,
      };
      const saved =
        mode === "create"
          ? await warehouseApi.create(payload)
          : await warehouseApi.update(warehouse!.id, payload);

      onSaved(saved);
      toast.success(
        mode === "create"
          ? `Warehouse "${saved.name}" created!`
          : `Warehouse "${saved.name}" updated!`
      );
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-uppercase code as user types
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("code", e.target.value.toUpperCase(), { shouldValidate: true });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">
            {mode === "create" ? "Add Warehouse" : "Edit Warehouse"}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {apiError && (
            <div className="alert alert-error fade-in" style={{ marginBottom: "1rem" }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{apiError}</span>
            </div>
          )}

          <form id="warehouse-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="wh-name">
                Warehouse name <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Building2 size={15} /></span>
                <input
                  id="wh-name"
                  type="text"
                  className={`form-input${errors.name ? " error" : ""}`}
                  placeholder="Main Distribution Center"
                  autoFocus
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="form-error"><AlertCircle size={12} />{errors.name.message}</p>
              )}
            </div>

            {/* Code */}
            <div className="form-group">
              <label className="form-label" htmlFor="wh-code">
                Warehouse code <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Hash size={15} /></span>
                <input
                  id="wh-code"
                  type="text"
                  className={`form-input${errors.code ? " error" : ""}`}
                  placeholder="WH-MAIN"
                  autoComplete="off"
                  {...register("code", { onChange: handleCodeChange })}
                />
              </div>
              {errors.code ? (
                <p className="form-error"><AlertCircle size={12} />{errors.code.message}</p>
              ) : (
                <p className="form-hint">Short unique identifier — auto uppercased</p>
              )}
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="wh-address">
                Address <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon" style={{ top: "1rem", transform: "none" }}>
                  <MapPin size={15} />
                </span>
                <textarea
                  id="wh-address"
                  className={`form-input${errors.address ? " error" : ""}`}
                  placeholder="123 Logistics Park, City, State 110001"
                  rows={2}
                  style={{ paddingTop: "0.75rem", resize: "none" }}
                  {...register("address")}
                />
              </div>
              {errors.address && (
                <p className="form-error"><AlertCircle size={12} />{errors.address.message}</p>
              )}
            </div>

            {/* Active toggle */}
            <div className="toggle-group">
              <div className="toggle-label-group">
                <span className="toggle-label">Active status</span>
                <span className="toggle-hint">
                  Inactive warehouses are hidden from operations
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  checked={isActiveVal}
                  onChange={(e) => setValue("isActive", e.target.checked)}
                />
                <span className="toggle-track" />
              </label>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: "0 0 auto", width: "auto", padding: "0.75rem 1.25rem" }}>
            Cancel
          </button>
          <button
            type="submit"
            form="warehouse-form"
            className="btn btn-primary"
            disabled={isLoading || (mode === "edit" && !isDirty)}
          >
            {isLoading ? (
              <><span className="btn-spinner" />{mode === "create" ? "Creating…" : "Saving…"}</>
            ) : mode === "create" ? (
              "Create Warehouse"
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Warehouses Page ─────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filtered, setFiltered] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.getAll();
      setWarehouses(data);
      setFiltered(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWarehouses();
  }, [user, fetchWarehouses]);

  // Client-side search filter
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      warehouses.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.code.toLowerCase().includes(q) ||
          (w.address ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, warehouses]);

  // Stats
  const totalCount = warehouses.length;
  const activeCount = warehouses.filter((w) => w.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Modal handlers
  const openCreate = () => { setEditTarget(null); setModalMode("create"); };
  const openEdit = (w: Warehouse) => { setEditTarget(w); setModalMode("edit"); };
  const closeModal = () => { setModalMode(null); setEditTarget(null); };

  const handleSaved = (saved: Warehouse) => {
    setWarehouses((prev) => {
      const exists = prev.find((w) => w.id === saved.id);
      return exists
        ? prev.map((w) => (w.id === saved.id ? saved : w))
        : [saved, ...prev];
    });
    closeModal();
  };

  // Quick toggle active from table
  const handleToggleActive = async (warehouse: Warehouse) => {
    try {
      const updated = await warehouseApi.update(warehouse.id, {
        isActive: !warehouse.isActive,
      });
      setWarehouses((prev) =>
        prev.map((w) => (w.id === updated.id ? updated : w))
      );
      toast.success(
        `${updated.name} marked as ${updated.isActive ? "active" : "inactive"}`
      );
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
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
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1>Warehouses</h1>
            <p>Manage your storage locations and their operational status</p>
          </div>
          <button
            id="add-warehouse-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={openCreate}
          >
            <Plus size={16} /> Add Warehouse
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet">
              <WarehouseIcon size={20} />
            </div>
            <div>
              <div className="stat-label">Total</div>
              <div className="stat-value">{totalCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{activeCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-amber">
              <XCircle size={20} />
            </div>
            <div>
              <div className="stat-label">Inactive</div>
              <div className="stat-value">{inactiveCount}</div>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              All Warehouses{" "}
              {!loading && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8125rem" }}>
                  ({filtered.length})
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className="icon-btn"
                onClick={fetchWarehouses}
                title="Refresh"
                style={{ width: 36, height: 36 }}
              >
                <RefreshCw size={15} />
              </button>
              <div className="table-search">
                <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search warehouses…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  id="wh-search"
                />
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon">
                          <WarehouseIcon size={28} />
                        </div>
                        <h3>
                          {search ? "No results found" : "No warehouses yet"}
                        </h3>
                        <p>
                          {search
                            ? `No warehouses match "${search}"`
                            : "Create your first warehouse to start tracking inventory."}
                        </p>
                        {!search && (
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
                            onClick={openCreate}
                          >
                            <Plus size={15} /> Add First Warehouse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((wh) => (
                    <tr key={wh.id}>
                      {/* Name */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "rgba(124,58,237,0.08)",
                              border: "1px solid rgba(124,58,237,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <WarehouseIcon size={14} color="var(--color-violet-400)" />
                          </div>
                          <span style={{ fontWeight: 500 }}>{wh.name}</span>
                        </div>
                      </td>

                      {/* Code */}
                      <td>
                        <span className="table-code">{wh.code}</span>
                      </td>

                      {/* Address */}
                      <td style={{ color: "var(--color-text-secondary)", maxWidth: 220 }}>
                        <div
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 220,
                          }}
                          title={wh.address ?? undefined}
                        >
                          {wh.address ? (
                            <>
                              <MapPin
                                size={12}
                                style={{ marginRight: 4, opacity: 0.6, verticalAlign: "middle" }}
                              />
                              {wh.address}
                            </>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status — clickable to toggle */}
                      <td>
                        <button
                          className={`badge ${wh.isActive ? "badge-active" : "badge-inactive"}`}
                          onClick={() => handleToggleActive(wh)}
                          title={`Click to mark as ${wh.isActive ? "inactive" : "active"}`}
                          style={{ border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                        >
                          <span className="badge-dot" />
                          {wh.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Created */}
                      <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                        {new Date(wh.createdAt).toLocaleDateString("en-IN", {
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
                            onClick={() => openEdit(wh)}
                            title="Edit warehouse"
                            id={`edit-wh-${wh.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <WarehouseModal
          mode={modalMode}
          warehouse={editTarget ?? undefined}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
