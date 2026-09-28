import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "VaultFlow — Inventory Management",
    template: "%s | VaultFlow",
  },
  description:
    "VaultFlow is a powerful, multi-tenant inventory management platform. Streamline your warehouse operations, track stock movements, and manage orders with ease.",
  keywords: ["inventory management", "warehouse", "stock tracking", "VaultFlow"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
