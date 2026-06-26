"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser, AuthContextValue } from "@/types/auth";
import { authService } from "@/lib/services/user.service";

const SESSION_KEY = "trinova_user";
const TOKEN_KEY = "trinova_token";

function setSessionCookie(value: "1" | "") {
  if (value) {
    document.cookie = "trinova_session=1; path=/; SameSite=Lax";
  } else {
    document.cookie =
      "trinova_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getRedirectPath(role: AuthUser["role"]) {
  switch (role) {
    case "penjualan":
      return "/penjualan";
    case "pembelian":
      return "/pembelian";
    case "persediaan":
      return "/persediaan";
    case "admin":
    default:
      return "/dashboard";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem(SESSION_KEY);
      const savedToken = sessionStorage.getItem(TOKEN_KEY);

      if (savedUser && savedToken) {
        const parsedUser = JSON.parse(savedUser) as AuthUser;
        setUser(parsedUser);
        setSessionCookie("1");
      } else {
        setSessionCookie("");
        if (pathname !== "/login") {
          router.replace("/login");
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      setSessionCookie("");
      if (pathname !== "/login") {
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (isLoading || !user) return;

    if (pathname === "/login") {
      router.replace(getRedirectPath(user.role));
      return;
    }

    if (user.role !== "admin" && pathname === "/dashboard") {
      router.replace(getRedirectPath(user.role));
    }
  }, [isLoading, pathname, router, user]);

  const login = async (
    email: string,
    password: string
  ): Promise<AuthUser> => {
    const authUser = await authService.login({
      email,
      password,
    });

    setUser(authUser);

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    sessionStorage.setItem(TOKEN_KEY, authUser.token);

    setSessionCookie("1");

    return authUser;
  };

  const logout = () => {
    setUser(null);

    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);

    setSessionCookie("");

    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }

  return ctx;
}
