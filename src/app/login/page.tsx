"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Hash,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Building2,
  CheckCircle2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { organizationApi, userApi, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Organization } from "@/lib/types";

const SLUG_STORAGE_KEY = "vaultflow_last_workspace";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const slugSchema = z.object({
  slug: z
    .string()
    .min(1, "Workspace URL is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed"
    ),
  rememberWorkspace: z.boolean().optional(),
});

const credentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SlugFormData = z.infer<typeof slugSchema>;
type CredentialsFormData = z.infer<typeof credentialsSchema>;

// ─── Step 1: Workspace Slug ────────────────────────────────────────────────────

function WorkspaceStep({
  onSuccess,
}: {
  onSuccess: (org: Organization, remember: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SlugFormData>({
    resolver: zodResolver(slugSchema),
    defaultValues: { rememberWorkspace: true },
  });

  // Pre-fill remembered workspace on mount
  useEffect(() => {
    const saved = localStorage.getItem(SLUG_STORAGE_KEY);
    if (saved) setValue("slug", saved);
  }, [setValue]);

  const onSubmit = async (data: SlugFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const org = await organizationApi.resolveSlug(data.slug.trim());
      if (data.rememberWorkspace) {
        localStorage.setItem(SLUG_STORAGE_KEY, data.slug.trim());
      } else {
        localStorage.removeItem(SLUG_STORAGE_KEY);
      }
      onSuccess(org, data.rememberWorkspace ?? false);
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="slide-in">
      <div className="auth-header">
        <h1>Sign in to VaultFlow</h1>
        <p>Enter your workspace URL to continue</p>
      </div>

      {apiError && (
        <div className="alert alert-error fade-in" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-slug">
            Workspace URL <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Hash size={16} />
            </span>
            <input
              id="login-slug"
              type="text"
              className={`form-input${errors.slug ? " error" : ""}`}
              placeholder="your-company"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="none"
              {...register("slug")}
            />
          </div>
          {errors.slug ? (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.slug.message}
            </p>
          ) : (
            <p className="form-hint">
              The slug you chose when you created your organization
            </p>
          )}
        </div>

        {/* Remember workspace checkbox */}
        <label
          htmlFor="remember-workspace"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            cursor: "pointer",
            marginBottom: "0.5rem",
          }}
        >
          <input
            id="remember-workspace"
            type="checkbox"
            defaultChecked
            {...register("rememberWorkspace")}
            style={{
              width: 16,
              height: 16,
              accentColor: "var(--color-violet-600)",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary)",
            }}
          >
            Remember this workspace
          </span>
        </label>

        <button
          id="login-workspace-submit"
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" />
              Looking up workspace…
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        New to VaultFlow?{" "}
        <Link href="/register">Create a workspace</Link>
      </div>
    </div>
  );
}

// ─── Step 2: Email + Password ──────────────────────────────────────────────────

function CredentialsStep({
  organization,
  onBack,
}: {
  organization: Organization;
  onBack: () => void;
}) {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
  });

  const onSubmit = async (data: CredentialsFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const result = await userApi.login({
        organizationId: organization.id,
        email: data.email,
        password: data.password,
      });
      setAuth(result.accessToken, result.user);
      toast.success(`Welcome back, ${result.user.name || result.user.email}!`);
      router.push("/dashboard");
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="slide-in">
      {/* Resolved org badge */}
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: "10px",
          padding: "0.625rem 0.875rem",
          marginBottom: "1.75rem",
          cursor: "pointer",
          width: "100%",
          color: "var(--color-text-primary)",
          fontFamily: "Inter, sans-serif",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(124,58,237,0.13)")
        }
        onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          "rgba(124,58,237,0.08)")
        }
      >
        <Building2 size={15} color="var(--color-violet-400)" />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-violet-400)",
          }}
        >
          {organization.name}
        </span>
        <CheckCircle2 size={14} color="var(--color-success)" />
        <ChevronLeft
          size={14}
          color="var(--color-text-muted)"
          style={{ marginLeft: 4 }}
        />
      </button>

      <div className="auth-header">
        <h1>Welcome back</h1>
        <p>Sign in to continue to your dashboard</p>
      </div>

      {apiError && (
        <div className="alert alert-error fade-in" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Email */}
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            Email address <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Mail size={16} />
            </span>
            <input
              id="login-email"
              type="email"
              className={`form-input${errors.email ? " error" : ""}`}
              placeholder="you@company.com"
              autoFocus
              autoComplete="email"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Password <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={16} />
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className={`form-input form-input-padded-right${errors.password ? " error" : ""}`}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          id="login-submit"
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="auth-footer">
        Not your workspace?{" "}
        <button onClick={onBack}>Switch workspace</button>
      </div>
    </div>
  );
}

// ─── Main Login Page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const [org, setOrg] = useState<Organization | null>(null);

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
      <AuthLayout>
        {!org ? (
          <WorkspaceStep onSuccess={(resolved) => setOrg(resolved)} />
        ) : (
          <CredentialsStep organization={org} onBack={() => setOrg(null)} />
        )}
      </AuthLayout>
    </>
  );
}
