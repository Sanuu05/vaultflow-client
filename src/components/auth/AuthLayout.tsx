"use client";

import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
  showLeftPanel?: boolean;
}

// VaultFlow SVG Logo Icon
export function VaultIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="3"
        stroke="white"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.25" fill="white" />
      <line
        x1="12"
        y1="8.5"
        x2="12"
        y2="7"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15.5"
        y1="12"
        x2="17"
        y2="12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="12"
        x2="8.5"
        y2="12"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="7"
        x2="5"
        y2="8.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="19"
        y1="7"
        x2="19"
        y2="8.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Decorative hexagons SVG
function HexGrid() {
  return (
    <svg
      className="hex-grid"
      width="180"
      height="160"
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {[
        { cx: 40, cy: 40 },
        { cx: 100, cy: 40 },
        { cx: 70, cy: 90 },
        { cx: 130, cy: 90 },
        { cx: 40, cy: 140 },
        { cx: 100, cy: 140 },
      ].map((hex, i) => (
        <polygon
          key={i}
          points={`${hex.cx},${hex.cy - 28} ${hex.cx + 24},${hex.cy - 14} ${hex.cx + 24},${hex.cy + 14} ${hex.cx},${hex.cy + 28} ${hex.cx - 24},${hex.cy + 14} ${hex.cx - 24},${hex.cy - 14}`}
          stroke="rgba(124,58,237,0.4)"
          strokeWidth="1"
          fill="rgba(124,58,237,0.04)"
        />
      ))}
    </svg>
  );
}

const FEATURES = [
  "Multi-tenant organization management",
  "Real-time inventory tracking",
  "Warehouse & stock movement logs",
  "Purchase orders & supplier management",
];

export function AuthLayout({ children, showLeftPanel = true }: AuthLayoutProps) {
  if (!showLeftPanel) {
    return (
      <div className="auth-bg">
        <div className="grid-overlay" />
        <div className="auth-container">
          <div className="auth-card">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="grid-overlay" />
      <div className="auth-container">
        <div className="auth-card auth-card-wide">
          {/* LEFT PANEL */}
          <div className="auth-panel-left">
            <Link href="/" className="brand-logo">
              <div className="brand-logo-icon">
                <VaultIcon size={22} />
              </div>
              <span className="brand-logo-text">VaultFlow</span>
            </Link>

            <div className="brand-tagline">
              <h2>
                Your inventory,
                <br />
                under control.
              </h2>
              <p>
                A unified platform to manage warehouses, products, stock
                movements, and orders — all in one place.
              </p>
            </div>

            <div className="brand-features">
              {FEATURES.map((f) => (
                <div key={f} className="brand-feature-item">
                  <div className="brand-feature-dot" />
                  {f}
                </div>
              ))}
            </div>

            <HexGrid />
          </div>

          {/* RIGHT PANEL */}
          <div className="auth-panel-right">{children}</div>
        </div>
      </div>
    </div>
  );
}
