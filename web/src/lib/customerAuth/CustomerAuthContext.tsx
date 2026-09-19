"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api";

// A registered customer's own session — deliberately separate from
// lib/auth/AuthContext.tsx (the owner/staff dashboard login). Both can be
// active in the same browser at once without conflicting: different
// storage key, different backend token shape (see backend's
// CustomerTokenPayload), different endpoints.
interface CustomerUser {
  id: string;
  name: string;
  email: string;
}

interface CustomerAuthContextValue {
  token: string | null;
  customer: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

const STORAGE_KEY = "miqat.customerAuth";

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Same hydration-mismatch reasoning as AuthContext — reading
    // localStorage can only happen client-side.
    /* eslint-disable react-hooks/set-state-in-effect */
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token: string; customer: CustomerUser };
        setToken(parsed.token);
        setCustomer(parsed.customer);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<{ token: string; customer: CustomerUser }>("/customers/login", {
      email,
      password,
    });
    setToken(result.token);
    setCustomer(result.customer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  async function register(name: string, email: string, password: string) {
    const result = await api.post<{ token: string; customer: CustomerUser }>("/customers/register", {
      name,
      email,
      password,
    });
    setToken(result.token);
    setCustomer(result.customer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  function logout() {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <CustomerAuthContext.Provider value={{ token, customer, loading, login, register, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return ctx;
}
