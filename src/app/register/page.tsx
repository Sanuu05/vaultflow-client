"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Hash,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { organizationApi, userApi, extractErrorMessage } from "@/lib/api";
import type { Organization } from "@/lib/types";

// ==========================================
// Schemas
// ==========================================

const orgSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Name too long"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug too long")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
});

const userSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type OrgFormData = z.infer<typeof orgSchema>;
type UserFormData = z.infer<typeof userSchema>;

// ==========================================
// Password strength helper
// ==========================================

function getPasswordStrength(
  password: string
): { strength: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { strength: 1, label: "Weak" };
  if (score <= 3) return { strength: 2, label: "Fair" };
  return { strength: 3, label: "Strong" };
}

// ==========================================
// Step Indicator
// ==========================================

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Organization" },
    { id: 2, label: "Your Account" },
    { id: 3, label: "Done" },
  ];

  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s.id} className="step-item" style={{ display: "contents" }}>
          <div className="step-item" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              className={`step-circle ${step > s.id
                  ? "completed"
                  : step === s.id
                    ? "active"
                    : "inactive"
                }`}
            >
              {step > s.id ? <Check size={12} /> : s.id}
            </div>
            <span
              className={`step-label ${step === s.id ? "active" : ""}`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`step-connector ${step > s.id ? "completed" : ""}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ==========================================
// STEP 1: Organization Form
// ==========================================

function OrgStep({
  onSuccess,
}: {
  onSuccess: (org: Organization) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
  });

  const nameValue = watch("name", "");

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setValue("slug", slug, { shouldValidate: !!slug });
  };

  const onSubmit = async (data: OrgFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const org = await organizationApi.create(data);
      onSuccess(org);
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="slide-in">
      <div className="auth-header">
        <h1>Create your organization</h1>
        <p>Set up your company workspace — you&apos;ll be the owner.</p>
      </div>

      {apiError && (
        <div className="alert alert-error fade-in" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Organization Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-org-name">
            Organization name <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Building2 size={16} />
            </span>
            <input
              id="reg-org-name"
              type="text"
              className={`form-input${errors.name ? " error" : ""}`}
              placeholder="Acme Corp"
              autoFocus
              {...register("name", { onChange: handleNameChange })}
            />
          </div>
          {errors.name && (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Slug */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-slug">
            Workspace URL <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Hash size={16} />
            </span>
            <input
              id="reg-slug"
              type="text"
              className={`form-input${errors.slug ? " error" : ""}`}
              placeholder="acme-corp"
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
              Only lowercase letters, numbers, and hyphens. Auto-generated from name.
            </p>
          )}
        </div>

        <button
          id="reg-step1-submit"
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" />
              Creating workspace…
            </>
          ) : (
            <>
              Continue
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}

// ==========================================
// STEP 2: User Account Form
// ==========================================

function UserStep({
  organization,
  onSuccess,
  onBack,
}: {
  organization: Organization;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const passwordValue = watch("password", "");
  const pwStrength =
    passwordValue ? getPasswordStrength(passwordValue) : null;

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await userApi.register({
        organizationId: organization.id,
        email: data.email,
        name: data.name,
        password: data.password,
        role: "OWNER",
      });
      onSuccess();
    } catch (err) {
      setApiError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="slide-in">
      <div className="auth-header">
        <h1>Create your account</h1>
        <p>
          Setting up as owner of{" "}
          <strong style={{ color: "var(--color-violet-400)" }}>
            {organization.name}
          </strong>
        </p>
      </div>

      {apiError && (
        <div className="alert alert-error fade-in" role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Full Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">
            Full name <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <User size={16} />
            </span>
            <input
              id="reg-name"
              type="text"
              className={`form-input${errors.name ? " error" : ""}`}
              placeholder="John Doe"
              autoFocus
              autoComplete="name"
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">
            Work email <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Mail size={16} />
            </span>
            <input
              id="reg-email"
              type="email"
              className={`form-input${errors.email ? " error" : ""}`}
              placeholder="you@company.com"
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
          <label className="form-label" htmlFor="reg-password">
            Password <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={16} />
            </span>
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              className={`form-input form-input-padded-right${errors.password ? " error" : ""}`}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
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
          {errors.password ? (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.password.message}
            </p>
          ) : null}

          {/* Password strength meter */}
          {passwordValue && pwStrength && (
            <div className="password-strength fade-in">
              <div className="strength-bars">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`strength-bar ${i <= pwStrength.strength
                        ? pwStrength.strength === 1
                          ? "weak"
                          : pwStrength.strength === 2
                            ? "fair"
                            : "strong"
                        : ""
                      }`}
                  />
                ))}
              </div>
              <span className="strength-label">
                Password strength: {pwStrength.label}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm-password">
            Confirm password <span>*</span>
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <Lock size={16} />
            </span>
            <input
              id="reg-confirm-password"
              type={showConfirm ? "text" : "password"}
              className={`form-input form-input-padded-right${errors.confirmPassword ? " error" : ""}`}
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide" : "Show"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="form-error">
              <AlertCircle size={12} />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: "0 0 auto", width: "auto", padding: "0.875rem 1.25rem" }}
            onClick={onBack}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            id="reg-step2-submit"
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ flex: 1 }}
          >
            {isLoading ? (
              <>
                <span className="btn-spinner" />
                Creating account…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Complete Setup
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// STEP 3: Success
// ==========================================

function SuccessStep({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(organization.slug);
    setCopied(true);
    toast.success("Workspace URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="success-card fade-in">
      <div className="success-icon">
        <CheckCircle2 size={36} color="var(--color-success)" />
      </div>
      <h2>You&apos;re all set! 🎉</h2>
      <p>
        <strong>{organization.name}</strong> is ready. Use your workspace URL
        every time you sign in — it&apos;s how VaultFlow identifies your team.
      </p>

      {/* Slug — primary thing to remember */}
      <div
        className="org-id-display"
        style={{ textAlign: "left", marginBottom: "1rem" }}
      >
        <div className="org-id-display-label">Your Workspace URL</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.375rem",
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: "Space Grotesk, monospace",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "var(--color-violet-400)",
            }}
          >
            {organization.slug}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: copied
                ? "var(--color-success)"
                : "var(--color-text-muted)",
              transition: "color 0.2s",
              display: "flex",
              padding: "4px",
            }}
            aria-label="Copy workspace URL"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div
        className="alert alert-info"
        style={{ textAlign: "left", marginBottom: "1.5rem" }}
      >
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Bookmark this: your workspace URL is{" "}
          <strong style={{ color: "var(--color-violet-400)" }}>
            {organization.slug}
          </strong>
          . You&apos;ll type it on the login screen each time.
        </span>
      </div>

      <button
        id="go-to-login"
        className="btn btn-primary"
        onClick={() => router.push("/login")}
        style={{ marginTop: 0 }}
      >
        Go to Login
      </button>
    </div>
  );
}

// ==========================================
// MAIN REGISTER PAGE
// ==========================================

type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const handleOrgSuccess = (org: Organization) => {
    setOrganization(org);
    toast.success("Organization created! Now set up your account.");
    setStep(2);
  };

  const handleUserSuccess = () => {
    toast.success("Account created successfully!");
    setStep(3);
  };

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
        <StepIndicator step={step} />

        {step === 1 && <OrgStep onSuccess={handleOrgSuccess} />}
        {step === 2 && organization && (
          <UserStep
            organization={organization}
            onSuccess={handleUserSuccess}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && organization && (
          <SuccessStep organization={organization} />
        )}
      </AuthLayout>
    </>
  );
}
