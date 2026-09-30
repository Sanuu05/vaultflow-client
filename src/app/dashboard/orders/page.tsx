"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ShoppingCart,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Package,
  Warehouse as WarehouseIcon,
  User,
  Mail,
  MapPin,
  Hash,
  DollarSign,
  Eye,
  ChevronDown,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, extractErrorMessage } from "@/lib/order.api";
import { warehouseApi } from "@/lib/warehouse.api";
import { productApi } from "@/lib/product.api";
import { inventoryApi } from "@/lib/inventory.api";
import type { Order, OrderStatus } from "@/lib/order.types";
import type { Warehouse } from "@/lib/warehouse.types";
import type { Product } from "@/lib/product.types";
import type { InventoryItem } from "@/lib/inventory.types";

const LIMIT = 10;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  RESERVED: {
    label: "Reserved",
    color: "var(--color-violet-400)",
    bg: "rgba(124,58,237,0.12)",
    icon: <Clock size={11} />,
  },
  PROCESSING: {
    label: "Processing",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    icon: <Loader2 size={11} />,
  },
  SHIPPED: {
    label: "Shipped",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    icon: <Truck size={11} />,
  },
  DELIVERED: {
    label: "Delivered",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    icon: <CheckCircle size={11} />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    icon: <XCircle size={11} />,
  },
};

const ALL_STATUSES: OrderStatus[] = [
  "RESERVED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(val: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(val));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton" style={{ height: 14, width: "60%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "75%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: "50%" }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
          <td><div className="skeleton" style={{ height: 22, width: 90, borderRadius: 20 }} /></td>
          <td><div className="skeleton" style={{ height: 14, width: 70 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 60, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
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
        Showing {from}–{to} of {total} orders
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
                background:
                  p === page ? "rgba(124,58,237,0.15)" : "transparent",
                color:
                  p === page
                    ? "var(--color-violet-400)"
                    : "var(--color-text-secondary)",
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

// ─── Order Detail Drawer ───────────────────────────────────────────────────────

function OrderDetailDrawer({
  order,
  onClose,
  onStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (updated: Order) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const handleStatusChange = async (status: OrderStatus) => {
    if (status === order.status) {
      setShowStatusMenu(false);
      return;
    }
    setUpdating(true);
    setShowStatusMenu(false);
    try {
      const updated = await orderApi.updateStatus(order.id, { status });
      onStatusChange(updated);
      toast.success(`Order status updated to ${STATUS_CONFIG[status].label}`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0
  );

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ position: "sticky", top: 0, background: "var(--color-surface)", zIndex: 1 }}>
          <div>
            <span className="modal-title">Order #{order.orderNumber}</span>
            <div style={{ marginTop: 4 }}>
              <StatusBadge status={order.status} />
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Status Actions */}
          <div
            style={{
              background: "var(--color-surface-hover)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 2 }}>
                Current Status
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-secondary"
                disabled={updating || order.status === "CANCELLED" || order.status === "DELIVERED"}
                onClick={() => setShowStatusMenu((v) => !v)}
                style={{ width: "auto", padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: 6 }}
                id={`change-status-${order.id}`}
              >
                {updating ? <><span className="btn-spinner" /> Updating…</> : <>Update Status <ChevronDown size={13} /></>}
              </button>
              {showStatusMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: "0.375rem",
                    zIndex: 100,
                    minWidth: 160,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "0.5rem 0.75rem",
                          borderRadius: 8,
                          border: "none",
                          background: s === order.status ? cfg.bg : "transparent",
                          color: s === order.status ? cfg.color : "var(--color-text-secondary)",
                          cursor: s === order.status ? "default" : "pointer",
                          fontSize: "0.8125rem",
                          fontWeight: s === order.status ? 600 : 400,
                          textAlign: "left",
                        }}
                      >
                        {cfg.icon} {cfg.label}
                        {s === order.status && <CheckCircle size={12} style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Customer
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ background: "var(--color-surface-hover)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <User size={11} /> Name
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{order.customerName}</div>
              </div>
              <div style={{ background: "var(--color-surface-hover)", borderRadius: 10, padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  <Mail size={11} /> Email
                </div>
                <div style={{ fontSize: "0.875rem", wordBreak: "break-all" }}>{order.customerEmail}</div>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Shipping Address
            </div>
            <div style={{ background: "var(--color-surface-hover)", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
              <MapPin size={12} style={{ marginRight: 6, opacity: 0.6, verticalAlign: "middle" }} />
              {order.shippingAddress}, {order.city}
              {order.state && `, ${order.state}`} – {order.postalCode}, {order.country}
            </div>
          </div>

          {/* Warehouse & Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ background: "var(--color-surface-hover)", borderRadius: 10, padding: "0.75rem 1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <WarehouseIcon size={11} /> Warehouse
              </div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{order.warehouse.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{order.warehouse.code}</div>
            </div>
            <div style={{ background: "var(--color-surface-hover)", borderRadius: 10, padding: "0.75rem 1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 2 }}>Created</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{formatDate(order.createdAt)}</div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Items ({order.items.length})
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-hover)" }}>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Product</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Qty</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Unit Price</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderTop: idx > 0 ? "1px solid var(--color-border)" : "none" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.product.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{item.product.sku}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem" }}>{item.quantity}</td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 600 }}>
                        {formatCurrency(Number(item.unitPrice) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-surface-hover)" }}>
                    <td colSpan={3} style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 600, fontSize: "0.875rem" }}>
                      Total
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--color-violet-400)", fontSize: "0.9375rem" }}>
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: "auto", padding: "0.75rem 1.25rem" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Zod Schema ────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  productId: z.string().uuid("Select a valid product"),
  quantity: z
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be whole number")
    .min(1, "Min 1"),
  unitPrice: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Cannot be negative"),
});

const orderSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  orderNumber: z.string().min(1, "Order number is required").max(100),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email"),
  shippingAddress: z.string().min(1, "Shipping address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional().or(z.literal("")),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().optional().or(z.literal("")),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required"),
});

type OrderFormData = z.infer<typeof orderSchema>;

// ─── Create Order Modal ────────────────────────────────────────────────────────

function CreateOrderModal({
  warehouses,
  onClose,
  onCreated,
}: {
  warehouses: Warehouse[];
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      warehouseId: "",
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      customerName: "",
      customerEmail: "",
      shippingAddress: "",
      city: "",
      state: "",
      postalCode: "",
      country: "IN",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const selectedWarehouseId = watch("warehouseId");
  const watchedItems = watch("items");

  // Load products once
  useEffect(() => {
    setLoadingProducts(true);
    productApi
      .getAll({ limit: 200 })
      .then((res) => setProducts(res.items))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Load inventory when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      setInventory([]);
      return;
    }
    inventoryApi
      .getAll({ warehouseId: selectedWarehouseId, limit: 200 })
      .then((res) => setInventory(res.items))
      .catch(() => setInventory([]));
  }, [selectedWarehouseId]);

  // Auto-fill unit price from product price when product changes
  const handleProductChange = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setValue(`items.${idx}.unitPrice`, Number(prod.price));
    }
  };

  const getStockForProduct = (productId: string) => {
    const inv = inventory.find((i) => i.productId === productId);
    return inv?.quantity ?? null;
  };

  const computedTotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );

  const onSubmit = async (data: OrderFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        ...data,
        state: data.state || undefined,
        country: data.country || "IN",
        totalAmount: computedTotal,
        items: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };
      const created = await orderApi.create(payload);
      onCreated(created);
      toast.success(`Order #${created.orderNumber} created!`);
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 660, maxHeight: "92vh", overflowY: "auto" }}
      >
        <div className="modal-header" style={{ position: "sticky", top: 0, background: "var(--color-surface)", zIndex: 1 }}>
          <span className="modal-title">Create New Order</span>
          <button className="modal-close" onClick={onClose}>
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

          <form id="order-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── Section: Order Info ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
                Order Info
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                {/* Warehouse */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-warehouse">
                    Warehouse <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><WarehouseIcon size={15} /></span>
                    <select
                      id="o-warehouse"
                      className={`form-input${errors.warehouseId ? " error" : ""}`}
                      style={{ paddingLeft: "2.25rem", appearance: "none" }}
                      {...register("warehouseId")}
                    >
                      <option value="">Select warehouse…</option>
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

                {/* Order Number */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-number">
                    Order Number <span>*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Hash size={15} /></span>
                    <input
                      id="o-number"
                      type="text"
                      className={`form-input${errors.orderNumber ? " error" : ""}`}
                      placeholder="ORD-001234"
                      {...register("orderNumber")}
                    />
                  </div>
                  {errors.orderNumber && (
                    <p className="form-error"><AlertCircle size={12} />{errors.orderNumber.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section: Customer ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
                Customer Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-cname">Name <span>*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={15} /></span>
                    <input id="o-cname" type="text" className={`form-input${errors.customerName ? " error" : ""}`} placeholder="Rahul Sharma" {...register("customerName")} />
                  </div>
                  {errors.customerName && <p className="form-error"><AlertCircle size={12} />{errors.customerName.message}</p>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-cemail">Email <span>*</span></label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Mail size={15} /></span>
                    <input id="o-cemail" type="email" className={`form-input${errors.customerEmail ? " error" : ""}`} placeholder="rahul@example.com" {...register("customerEmail")} />
                  </div>
                  {errors.customerEmail && <p className="form-error"><AlertCircle size={12} />{errors.customerEmail.message}</p>}
                </div>
              </div>
            </div>

            {/* ── Section: Shipping ── */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)", marginBottom: "0.875rem" }}>
                Shipping Address
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="o-addr">Street Address <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><MapPin size={15} /></span>
                  <input id="o-addr" type="text" className={`form-input${errors.shippingAddress ? " error" : ""}`} placeholder="Plot 42, Industrial Area" {...register("shippingAddress")} />
                </div>
                {errors.shippingAddress && <p className="form-error"><AlertCircle size={12} />{errors.shippingAddress.message}</p>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
                  <label className="form-label" htmlFor="o-city">City <span>*</span></label>
                  <input id="o-city" type="text" className={`form-input${errors.city ? " error" : ""}`} placeholder="Mumbai" {...register("city")} />
                  {errors.city && <p className="form-error"><AlertCircle size={12} />{errors.city.message}</p>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-state">State</label>
                  <input id="o-state" type="text" className="form-input" placeholder="MH" {...register("state")} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="o-pin">Postal Code <span>*</span></label>
                  <input id="o-pin" type="text" className={`form-input${errors.postalCode ? " error" : ""}`} placeholder="400001" {...register("postalCode")} />
                  {errors.postalCode && <p className="form-error"><AlertCircle size={12} />{errors.postalCode.message}</p>}
                </div>
              </div>
            </div>

            {/* ── Section: Items ── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>
                  Order Items
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "0.375rem 0.875rem", fontSize: "0.8125rem" }}
                  onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {errors.items?.root && (
                <p className="form-error" style={{ marginBottom: "0.5rem" }}>
                  <AlertCircle size={12} />{errors.items.root.message}
                </p>
              )}

              {!selectedWarehouseId && (
                <div style={{ padding: "0.875rem 1rem", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: "0.8125rem", color: "#f59e0b", marginBottom: "0.75rem" }}>
                  ⚠ Select a warehouse first to see available stock.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {fields.map((field, idx) => {
                  const selectedProductId = watchedItems[idx]?.productId;
                  const stock = selectedProductId ? getStockForProduct(selectedProductId) : null;
                  return (
                    <div
                      key={field.id}
                      style={{
                        background: "var(--color-surface-hover)",
                        borderRadius: 12,
                        padding: "0.875rem 1rem",
                        border: "1px solid var(--color-border)",
                        display: "grid",
                        gridTemplateColumns: "2fr 80px 110px 32px",
                        gap: "0.75rem",
                        alignItems: "start",
                      }}
                    >
                      {/* Product Select */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>
                          Product <span>*</span>
                          {stock !== null && (
                            <span style={{ marginLeft: 6, color: stock > 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                              ({stock} in stock)
                            </span>
                          )}
                        </label>
                        <select
                          className={`form-input${errors.items?.[idx]?.productId ? " error" : ""}`}
                          style={{ fontSize: "0.8125rem" }}
                          disabled={loadingProducts}
                          {...register(`items.${idx}.productId`, {
                            onChange: (e) => handleProductChange(idx, e.target.value),
                          })}
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        {errors.items?.[idx]?.productId && (
                          <p className="form-error" style={{ fontSize: "0.72rem" }}>
                            <AlertCircle size={11} />{errors.items[idx]?.productId?.message}
                          </p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Qty <span>*</span></label>
                        <input
                          type="number"
                          min={1}
                          className={`form-input${errors.items?.[idx]?.quantity ? " error" : ""}`}
                          style={{ fontSize: "0.8125rem" }}
                          {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        />
                        {errors.items?.[idx]?.quantity && (
                          <p className="form-error" style={{ fontSize: "0.72rem" }}>
                            <AlertCircle size={11} />{errors.items[idx]?.quantity?.message}
                          </p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Unit Price <span>*</span></label>
                        <div className="input-wrapper">
                          <span className="input-icon" style={{ fontSize: "0.75rem" }}>₹</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`form-input${errors.items?.[idx]?.unitPrice ? " error" : ""}`}
                            style={{ fontSize: "0.8125rem" }}
                            {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                          />
                        </div>
                        {errors.items?.[idx]?.unitPrice && (
                          <p className="form-error" style={{ fontSize: "0.72rem" }}>
                            <AlertCircle size={11} />{errors.items[idx]?.unitPrice?.message}
                          </p>
                        )}
                      </div>

                      {/* Remove button */}
                      <div style={{ paddingTop: "1.625rem" }}>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            onClick={() => remove(idx)}
                            title="Remove item"
                            style={{ width: 30, height: 30 }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div
                style={{
                  marginTop: "0.875rem",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  Order Total:
                </span>
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "var(--color-violet-400)",
                  }}
                >
                  {formatCurrency(computedTotal)}
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer" style={{ position: "sticky", bottom: 0, background: "var(--color-surface)" }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: "auto", padding: "0.75rem 1.25rem" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="order-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Creating…</>
            ) : (
              <><ShoppingCart size={15} /> Create Order</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Confirm Modal ──────────────────────────────────────────────────────

function CancelModal({
  order,
  onClose,
  onCancelled,
}: {
  order: Order;
  onClose: () => void;
  onCancelled: (updated: Order) => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleCancel = async () => {
    setLoading(true);
    try {
      const updated = await orderApi.updateStatus(order.id, {
        status: "CANCELLED",
      });
      onCancelled(updated);
      toast.success(`Order #${order.orderNumber} cancelled`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span
            className="modal-title"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <AlertTriangle size={18} color="var(--color-error)" />
            Cancel Order
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Are you sure you want to cancel order{" "}
            <strong style={{ color: "var(--color-text-primary)" }}>
              #{order.orderNumber}
            </strong>
            ?
          </p>
          <p style={{ fontSize: "0.8125rem", color: "#f59e0b", marginTop: "0.75rem" }}>
            This will restock all reserved inventory automatically.
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: "auto", padding: "0.75rem 1.25rem" }}
          >
            Keep Order
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCancel}
            disabled={loading}
            style={{
              background: "var(--color-error)",
              boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
            }}
          >
            {loading ? (
              <><span className="btn-spinner" /> Cancelling…</>
            ) : (
              <><XCircle size={15} /> Cancel Order</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Orders Page ──────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: LIMIT,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Load warehouses once
  useEffect(() => {
    if (user) {
      warehouseApi.getAll().then(setWarehouses).catch(() => {});
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.getAll({
        page,
        limit: LIMIT,
        status: statusFilter || undefined,
        warehouseId: warehouseFilter || undefined,
      });
      setOrders(res.items);
      setMeta(res.meta);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, warehouseFilter]);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  const handleFilterChange = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setPage(1), 300);
  };

  const handleCreated = (order: Order) => {
    setShowCreate(false);
    fetchOrders();
  };

  const handleStatusChanged = (updated: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
    if (detailOrder?.id === updated.id) {
      setDetailOrder(updated);
    }
    setCancelTarget(null);
  };

  // Stats
  const activeCount = orders.filter(
    (o) => !["CANCELLED", "DELIVERED"].includes(o.status)
  ).length;
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + Number(o.totalAmount), 0);

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
            <h1>Orders</h1>
            <p>Manage customer orders and track fulfillment status</p>
          </div>
          <button
            id="create-order-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} /> New Order
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet">
              <ShoppingCart size={20} />
            </div>
            <div>
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{meta.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan">
              <Clock size={20} />
            </div>
            <div>
              <div className="stat-label">Active Orders</div>
              <div className="stat-value">{activeCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <DollarSign size={20} />
            </div>
            <div>
              <div className="stat-label">Revenue (this view)</div>
              <div className="stat-value" style={{ fontSize: "1.125rem" }}>
                {formatCurrency(totalRevenue)}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              All Orders{" "}
              {!loading && (
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    fontWeight: 400,
                    fontSize: "0.8125rem",
                  }}
                >
                  ({meta.total})
                </span>
              )}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                flexWrap: "wrap",
              }}
            >
              {/* Refresh */}
              <button
                className="icon-btn"
                onClick={fetchOrders}
                title="Refresh"
                style={{ width: 36, height: 36 }}
              >
                <RefreshCw size={15} />
              </button>

              {/* Warehouse filter */}
              <div className="table-search" style={{ width: "auto", minWidth: 160 }}>
                <WarehouseIcon size={14} style={{ color: "var(--color-text-muted)" }} />
                <select
                  id="warehouse-filter"
                  value={warehouseFilter}
                  onChange={(e) => {
                    setWarehouseFilter(e.target.value);
                    handleFilterChange();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    fontSize: "0.8125rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="table-search" style={{ width: "auto", minWidth: 140 }}>
                <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as OrderStatus | "");
                    handleFilterChange();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    fontSize: "0.8125rem",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">All Statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
                {statusFilter && (
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setPage(1);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                    }}
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
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Warehouse</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-icon">
                          <ShoppingCart size={28} />
                        </div>
                        <h3>
                          {statusFilter
                            ? `No ${STATUS_CONFIG[statusFilter as OrderStatus]?.label} orders`
                            : "No orders yet"}
                        </h3>
                        <p>
                          {statusFilter
                            ? "Try clearing the status filter."
                            : "Create your first order to get started."}
                        </p>
                        {!statusFilter && (
                          <button
                            className="btn btn-primary"
                            style={{
                              width: "auto",
                              padding: "0.625rem 1.25rem",
                              margin: 0,
                            }}
                            onClick={() => setShowCreate(true)}
                          >
                            <Plus size={15} /> Create First Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      {/* Order # */}
                      <td>
                        <span
                          style={{
                            fontFamily: "Space Grotesk, sans-serif",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: "var(--color-violet-400)",
                          }}
                        >
                          #{order.orderNumber}
                        </span>
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                          {order.customerName}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {order.customerEmail}
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "0.875rem",
                        }}
                      >
                        {order.warehouse?.name ?? "—"}
                      </td>

                      {/* Items count */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          <Package size={13} />
                          {order.items.length}{" "}
                          {order.items.length === 1 ? "item" : "items"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Total */}
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            fontFamily: "Space Grotesk, sans-serif",
                          }}
                        >
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: "0.8125rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => setDetailOrder(order)}
                            title="View order details"
                            id={`view-order-${order.id}`}
                          >
                            <Eye size={14} />
                          </button>
                          {!["CANCELLED", "DELIVERED"].includes(
                            order.status
                          ) && (
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => setCancelTarget(order)}
                              title="Cancel order"
                              id={`cancel-order-${order.id}`}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
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

      {/* Create Order Modal */}
      {showCreate && (
        <CreateOrderModal
          warehouses={warehouses}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Order Detail Drawer */}
      {detailOrder && (
        <OrderDetailDrawer
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onStatusChange={handleStatusChanged}
        />
      )}

      {/* Cancel Confirm Modal */}
      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={handleStatusChanged}
        />
      )}
    </>
  );
}
