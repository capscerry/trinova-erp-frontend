"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

function getRedirectPath(role: string) {
  const normalizedRole = role.toLowerCase().trim();
  console.log("User role:", role, "-> Normalized:", normalizedRole);
  switch (normalizedRole) {
    case "penjualan":
      return "/penjualan";

    case "pembelian":
    case "purchasing":
    case "procurement manager":
    case "procurement_manager":
      return "/pembelian";

    // case "inventory":
    case "persediaan":
      return "/persediaan";

    case "admin":
      return "/dashboard";

    default:
      return "/dashboard";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const user = await login(email.trim(), password);

      const redirectPath = getRedirectPath(user.role);

      router.replace(redirectPath);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Email atau password salah.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-300 flex items-center justify-center shadow-md shadow-amber-200">
            <span className="text-white font-extrabold text-xl select-none leading-none">
              T
            </span>
          </div>

          <div>
            <p className="text-slate-800 font-bold tracking-widest text-base uppercase leading-tight">
              Trinova
            </p>
            <p className="text-slate-400 text-[10px] tracking-[3px] uppercase">
              Business Suite
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden">
          <div className="h-1 w-full bg-linear-to-r from-amber-400 via-amber-300 to-amber-500" />

          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-amber-500" />
              <h1 className="text-lg font-bold text-slate-800">
                Masuk ke Sistem
              </h1>
            </div>

            <p className="text-xs text-slate-400 mb-7 pl-6">
              Gunakan akun yang diberikan oleh administrator.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email"
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700
                             placeholder:text-slate-300 bg-slate-50
                             focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-150"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    disabled={loading}
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700
                               placeholder:text-slate-300 bg-slate-50
                               focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-150"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    disabled={loading}
                    aria-label={
                      showPw ? "Sembunyikan password" : "Tampilkan password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
                               focus:outline-none focus:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5"
                >
                  <span className="mt-px shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 mt-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900
                           text-white text-sm font-bold rounded-lg
                           flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2
                           transition-all duration-150 shadow-sm"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Memverifikasi..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          © {new Date().getFullYear()} Trinova &mdash; Hak akses dikelola oleh
          admin.
        </p>
      </div>
    </div>
  );
} 