"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  User,
  Mail,
  Lock,
  Shield,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Crown,
  UserCog,
  UserCheck,
  KeyRound,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { userManagementApi, extractErrorMessage } from "@/lib/user.api";
import type { UserResponse, UserRole } from "@/lib/types";

// ─── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; color: string; bg: string; icon: React.ReactNode; description: string }
> = {
  OWNER: {
    label: "Owner",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    icon: <Crown size={11} />,
    description: "Full system access",
  },
  ADMIN: {
    label: "Admin",
    color: "var(--color-violet-400)",
    bg: "rgba(124,58,237,0.12)",
    icon: <UserCog size={11} />,
    description: "Manage team & settings",
  },
  WAREHOUSE_STAFF: {
    label: "Staff",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    icon: <UserCheck size={11} />,
    description: "Inventory & orders",
  },
};

const ALL_ROLES: UserRole[] = ["OWNER", "ADMIN", "WAREHOUSE_STAFF"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Role Badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
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

// ─── User Avatar ───────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: `hsla(${hue}, 55%, 30%, 0.3)`,
        border: `1px solid hsla(${hue}, 60%, 55%, 0.25)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 700,
        fontSize: size * 0.35,
        color: `hsla(${hue}, 80%, 72%, 1)`,
        letterSpacing: "-0.01em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="skeleton-row">
          <td>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <div className="skeleton" style={{ height: 13, width: 120, marginBottom: 5 }} />
                <div className="skeleton" style={{ height: 11, width: 170 }} />
              </div>
            </div>
          </td>
          <td><div className="skeleton" style={{ height: 22, width: 80, borderRadius: 20 }} /></td>
          <td><div className="skeleton" style={{ height: 13, width: 80 }} /></td>
          <td><div className="skeleton" style={{ height: 28, width: 70, borderRadius: 8 }} /></td>
        </tr>
      ))}
    </>
  );
}

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
    role: z.enum(["OWNER", "ADMIN", "WAREHOUSE_STAFF"] as const),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CreateFormData = z.infer<typeof createSchema>;

const editSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Invalid email address"),
    role: z.enum(["OWNER", "ADMIN", "WAREHOUSE_STAFF"] as const),
    password: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 8, {
        message: "Password must be at least 8 characters",
      }),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (d) => !d.password || d.password === d.confirmPassword,
    { message: "Passwords do not match", path: ["confirmPassword"] }
  );

type EditFormData = z.infer<typeof editSchema>;

// ─── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  organizationId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: (u: UserResponse) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: "WAREHOUSE_STAFF" },
  });

  const onSubmit = async (data: CreateFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const created = await userManagementApi.create({
        organizationId,
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      onCreated(created);
      toast.success(`${created.name} added to the team!`);
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
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">Invite Team Member</span>
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

          <form id="create-user-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="u-name">
                Full name <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={15} /></span>
                <input
                  id="u-name"
                  type="text"
                  className={`form-input${errors.name ? " error" : ""}`}
                  placeholder="Priya Sharma"
                  autoFocus
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="form-error"><AlertCircle size={12} />{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="u-email">
                Email address <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={15} /></span>
                <input
                  id="u-email"
                  type="email"
                  className={`form-input${errors.email ? " error" : ""}`}
                  placeholder="priya@company.com"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="form-error"><AlertCircle size={12} />{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label" htmlFor="u-role">
                Role <span>*</span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon"><Shield size={15} /></span>
                <select
                  id="u-role"
                  className={`form-input${errors.role ? " error" : ""}`}
                  style={{ paddingLeft: "2.25rem", appearance: "none" }}
                  {...register("role")}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].label} — {ROLE_CONFIG[r].description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="u-pass">
                  Password <span>*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="u-pass"
                    type={showPass ? "text" : "password"}
                    className={`form-input${errors.password ? " error" : ""}`}
                    placeholder="Min 8 characters"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}
                  >
                    <KeyRound size={14} />
                  </button>
                </div>
                {errors.password && (
                  <p className="form-error"><AlertCircle size={12} />{errors.password.message}</p>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="u-confirm">
                  Confirm <span>*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="u-confirm"
                    type={showPass ? "text" : "password"}
                    className={`form-input${errors.confirmPassword ? " error" : ""}`}
                    placeholder="Re-enter password"
                    {...register("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="form-error"><AlertCircle size={12} />{errors.confirmPassword.message}</p>
                )}
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
            form="create-user-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Adding…</>
            ) : (
              <><Plus size={15} /> Add Member</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────────────────────

function EditUserModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: UserResponse;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (u: UserResponse) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: EditFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const payload: Record<string, any> = {
        name: data.name,
        email: data.email,
        role: data.role,
      };
      if (changePassword && data.password) {
        payload.password = data.password;
      }
      const updated = await userManagementApi.update(user.id, payload);
      onSaved(updated);
      toast.success(`${updated.name} updated!`);
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
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <UserAvatar name={user.name} size={32} />
            <span className="modal-title">{user.name}</span>
          </div>
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

          <form id="edit-user-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div className="form-group" style={{ marginBottom: 0, gridColumn: "span 2" }}>
                <label className="form-label" htmlFor="eu-name">Full name <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><User size={15} /></span>
                  <input
                    id="eu-name"
                    type="text"
                    className={`form-input${errors.name ? " error" : ""}`}
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="form-error"><AlertCircle size={12} />{errors.name.message}</p>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="eu-email">Email <span>*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input
                    id="eu-email"
                    type="email"
                    className={`form-input${errors.email ? " error" : ""}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="form-error"><AlertCircle size={12} />{errors.email.message}</p>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="eu-role">
                  Role <span>*</span>
                  {isSelf && <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}> (cannot change own)</span>}
                </label>
                <div className="input-wrapper">
                  <span className="input-icon"><Shield size={15} /></span>
                  <select
                    id="eu-role"
                    className="form-input"
                    style={{ paddingLeft: "2.25rem", appearance: "none" }}
                    disabled={isSelf}
                    {...register("role")}
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_CONFIG[r].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Change password toggle */}
            <div style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setChangePassword((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: changePassword ? "var(--color-violet-400)" : "var(--color-text-muted)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                <KeyRound size={13} />
                {changePassword ? "Cancel password change" : "Change password"}
              </button>

              {changePassword && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginTop: "0.875rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="eu-pass">New password</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Lock size={15} /></span>
                      <input
                        id="eu-pass"
                        type={showPass ? "text" : "password"}
                        className={`form-input${errors.password ? " error" : ""}`}
                        placeholder="Min 8 characters"
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}
                      >
                        <KeyRound size={14} />
                      </button>
                    </div>
                    {errors.password && <p className="form-error"><AlertCircle size={12} />{errors.password.message}</p>}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="eu-confirm">Confirm</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Lock size={15} /></span>
                      <input
                        id="eu-confirm"
                        type={showPass ? "text" : "password"}
                        className={`form-input${errors.confirmPassword ? " error" : ""}`}
                        placeholder="Re-enter"
                        {...register("confirmPassword")}
                      />
                    </div>
                    {errors.confirmPassword && <p className="form-error"><AlertCircle size={12} />{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              )}
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
            form="edit-user-form"
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

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  user,
  onClose,
  onDeleted,
}: {
  user: UserResponse;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await userManagementApi.delete(user.id);
      onDeleted(user.id);
      toast.success(`${user.name} removed from the team`);
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
          <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={18} color="var(--color-error)" />
            Remove Member
          </span>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem" }}>
            <UserAvatar name={user.name} size={44} />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{user.name}</div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{user.email}</div>
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Are you sure you want to remove this member? They will immediately lose access to VaultFlow.
          </p>
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
            className="btn btn-primary"
            onClick={handleDelete}
            disabled={loading}
            style={{ background: "var(--color-error)", boxShadow: "0 4px 20px rgba(239,68,68,0.3)" }}
          >
            {loading ? (
              <><span className="btn-spinner" /> Removing…</>
            ) : (
              <><Trash2 size={15} /> Remove</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Users Page ───────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading, organizationId } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) router.push("/login");
  }, [currentUser, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await userManagementApi.getAll(organizationId);
      setUsers(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (currentUser) fetchUsers();
  }, [currentUser, fetchUsers]);

  // Local filter (no pagination needed — org user lists are typically small)
  const filtered = users.filter((u) => {
    const matchRole = !roleFilter || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const handleCreated = (u: UserResponse) => {
    setShowCreate(false);
    setUsers((prev) => [u, ...prev]);
  };

  const handleSaved = (u: UserResponse) => {
    setEditTarget(null);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
  };

  const handleDeleted = (id: string) => {
    setDeleteTarget(null);
    setUsers((prev) => prev.filter((x) => x.id !== id));
  };

  // Role counts
  const ownerCount = users.filter((u) => u.role === "OWNER").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const staffCount = users.filter((u) => u.role === "WAREHOUSE_STAFF").length;

  if (authLoading || !currentUser) return null;

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
            <h1>Team Members</h1>
            <p>Manage who has access to your VaultFlow workspace</p>
          </div>
          <button
            id="invite-member-btn"
            className="btn btn-primary"
            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} /> Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet">
              <Users size={20} />
            </div>
            <div>
              <div className="stat-label">Total Members</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <Crown size={20} color="#f59e0b" />
            </div>
            <div>
              <div className="stat-label">Owners</div>
              <div className="stat-value">{ownerCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan">
              <UserCog size={20} />
            </div>
            <div>
              <div className="stat-label">Admins</div>
              <div className="stat-value">{adminCount}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="stat-label">Staff</div>
              <div className="stat-value">{staffCount}</div>
            </div>
          </div>
        </div>

        {/* Team Cards */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              All Members{" "}
              {!loading && (
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: "0.8125rem" }}>
                  ({filtered.length})
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <button
                className="icon-btn"
                onClick={fetchUsers}
                title="Refresh"
                style={{ width: 36, height: 36 }}
              >
                <RefreshCw size={15} />
              </button>

              {/* Search */}
              <div className="table-search">
                <User size={14} style={{ color: "var(--color-text-muted)" }} />
                <input
                  id="user-search"
                  type="text"
                  placeholder="Search name or email…"
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

              {/* Role filter */}
              <div className="table-search" style={{ width: "auto", minWidth: 140 }}>
                <Shield size={14} style={{ color: "var(--color-text-muted)" }} />
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
                  style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: "0.8125rem", outline: "none", cursor: "pointer" }}
                >
                  <option value="">All Roles</option>
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
                {roleFilter && (
                  <button
                    onClick={() => setRoleFilter("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Member Table */}
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <div className="empty-icon"><Users size={28} /></div>
                        <h3>
                          {search || roleFilter ? "No members found" : "No team members yet"}
                        </h3>
                        <p>
                          {search || roleFilter
                            ? "Try adjusting your filters."
                            : "Invite your first team member to get started."}
                        </p>
                        {!search && !roleFilter && (
                          <button
                            className="btn btn-primary"
                            style={{ width: "auto", padding: "0.625rem 1.25rem", margin: 0 }}
                            onClick={() => setShowCreate(true)}
                          >
                            <Plus size={15} /> Invite First Member
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} style={isSelf ? { background: "rgba(124,58,237,0.04)" } : undefined}>
                        {/* Member info */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <UserAvatar name={u.name} />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{u.name}</span>
                                {isSelf && (
                                  <span style={{
                                    fontSize: "0.6875rem",
                                    fontWeight: 600,
                                    color: "var(--color-violet-400)",
                                    background: "rgba(124,58,237,0.12)",
                                    border: "1px solid rgba(124,58,237,0.2)",
                                    padding: "1px 7px",
                                    borderRadius: 20,
                                  }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: 1 }}>
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td><RoleBadge role={u.role} /></td>

                        {/* Joined date */}
                        <td style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              onClick={() => setEditTarget(u)}
                              title="Edit member"
                              id={`edit-user-${u.id}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-btn icon-btn-danger"
                              onClick={() => setDeleteTarget(u)}
                              title={isSelf ? "Cannot delete yourself" : "Remove member"}
                              disabled={isSelf}
                              style={{ opacity: isSelf ? 0.3 : 1, cursor: isSelf ? "not-allowed" : "pointer" }}
                              id={`delete-user-${u.id}`}
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

          {/* Role legend */}
          {!loading && users.length > 0 && (
            <div style={{
              padding: "0.875rem 1.5rem",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Role permissions:</span>
              {ALL_ROLES.map((r) => {
                const cfg = ROLE_CONFIG[r];
                return (
                  <span key={r} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: cfg.color }}>
                    {cfg.icon}
                    <span style={{ fontWeight: 600 }}>{cfg.label}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>— {cfg.description}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && organizationId && (
        <CreateUserModal
          organizationId={organizationId}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          isSelf={editTarget.id === currentUser.id}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
