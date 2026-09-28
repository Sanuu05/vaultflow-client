"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { UserResponse } from "@/lib/types";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  organizationId: string | null;
  setAuth: (token: string, user: UserResponse) => void;
  clearAuth: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Rehydrate from localStorage
    const storedToken = localStorage.getItem("vaultflow_token");
    const storedUser = localStorage.getItem("vaultflow_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const setAuth = (newToken: string, newUser: UserResponse) => {
    localStorage.setItem("vaultflow_token", newToken);
    localStorage.setItem("vaultflow_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const clearAuth = () => {
    localStorage.removeItem("vaultflow_token");
    localStorage.removeItem("vaultflow_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizationId: user?.organizationId ?? null,
        setAuth,
        clearAuth,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
