"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, AuthContextValue, Role } from "@/types/auth";

// ─── Dummy users (ganti dengan API call nanti) ────────────────────────────────
const DUMMY_USERS: (AuthUser & { password: string })[] = [
  { id: "1", name: "Ahmad Rizky",   initials: "AR", role: "admin",      password: "admin123" },
  { id: "2", name: "Sari Dewi",     initials: "SD", role: "penjualan",  password: "sales123" },
  { id: "3", name: "Budi Santoso",  initials: "BS", role: "pembelian",  password: "beli123" },
  { id: "4", name: "Citra Lestari", initials: "CL", role: "persediaan", password: "gudang123" },
];

const SESSION_KEY = "trinova_user";

// Helper: set/clear cookie agar middleware bisa baca
function setSessionCookie(value: "1" | "") {
  if (value) {
    document.cookie = "trinova_session=1; path=/; SameSite=Lax";
  } else {
    document.cookie = "trinova_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore session saat pertama load
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setUser(JSON.parse(saved));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 400)); // simulasi network

    const found = DUMMY_USERS.find(
      (u) =>
        u.name.toLowerCase().replace(/\s/g, ".") === username.toLowerCase() ||
        u.role === username.toLowerCase()
    );

    if (found && found.password === password) {
      const { password: _, ...authUser } = found;
      setUser(authUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      setSessionCookie("1");
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
    setSessionCookie("");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
