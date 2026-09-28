"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Warehouse,
  Package,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const QUICK_LINKS = [
  {
    label: "Warehouses",
    description: "Manage your storage locations",
    href: "/dashboard/warehouses",
    icon: Warehouse,
    color: "violet",
  },
  {
    label: "Products",
    description: "Catalog & SKU management",
    href: "/dashboard/products",
    icon: Package,
    color: "cyan",
  },
  {
    label: "Inventory",
    description: "Real-time stock levels",
    href: "/dashboard/inventory",
    icon: TrendingUp,
    color: "green",
  },
  {
    label: "Orders",
    description: "Fulfillment & shipping",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    color: "amber",
  },
];

export default function DashboardHome() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid rgba(124,58,237,0.2)",
            borderTopColor: "var(--color-violet-500)",
            animation: "spin 0.7s linear infinite",
          }}
        />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="dash-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            {greeting}, {user.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p>Here&apos;s what&apos;s happening with your inventory today.</p>
        </div>
      </div>

      {/* Quick links grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          const colorMap: Record<string, string> = {
            violet: "rgba(124,58,237,0.12)",
            cyan: "rgba(6,182,212,0.1)",
            green: "rgba(16,185,129,0.1)",
            amber: "rgba(245,158,11,0.1)",
          };
          const iconColorMap: Record<string, string> = {
            violet: "var(--color-violet-400)",
            cyan: "var(--color-cyan-400)",
            green: "var(--color-success)",
            amber: "var(--color-warning)",
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none" }}
            >
              <div
                className="stat-card"
                style={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "1rem",
                  cursor: "pointer",
                  padding: "1.5rem",
                }}
              >
                <div
                  className="stat-icon"
                  style={{ background: colorMap[item.color] }}
                >
                  <Icon size={20} color={iconColorMap[item.color]} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--color-text-primary)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {item.description}
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  style={{ color: "var(--color-text-muted)", marginLeft: "auto" }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Coming soon notice */}
      <div
        style={{
          background: "rgba(124,58,237,0.05)",
          border: "1px dashed rgba(124,58,237,0.2)",
          borderRadius: 16,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
          }}
        >
          📊 Analytics & charts coming soon. Start by managing your{" "}
          <Link
            href="/dashboard/warehouses"
            style={{ color: "var(--color-violet-400)" }}
          >
            warehouses
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
