"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { VaultIcon } from "@/components/auth/AuthLayout";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  LogOut,
  ChevronRight,
  Truck,
} from "lucide-react";
import "../dashboard/dashboard.css";

const NAV_ITEMS = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Warehouses", href: "/dashboard/warehouses", icon: Warehouse },
      { label: "Products", href: "/dashboard/products", icon: Package },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
      { label: "Inventory", href: "/dashboard/inventory", icon: TrendingUp },
      { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
    ],
  },
  {
    section: "Admin",
    items: [{ label: "Users", href: "/dashboard/users", icon: Users }],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSignOut = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="dash-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <Link href="/dashboard" className="sidebar-header">
          <div className="sidebar-logo-icon">
            <VaultIcon size={18} />
          </div>
          <span className="sidebar-logo-text">VaultFlow</span>
        </Link>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${isActive ? " active" : ""}`}
                  >
                    <Icon size={17} className="nav-icon" />
                    {item.label}
                    {isActive && (
                      <ChevronRight
                        size={13}
                        style={{ marginLeft: "auto", opacity: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-user" onClick={handleSignOut}>
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || user?.email}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <LogOut size={15} style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dash-main">{children}</main>
    </div>
  );
}
