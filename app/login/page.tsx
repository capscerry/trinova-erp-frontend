"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Username dan password wajib diisi."); return; }
    setError("");
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Username atau password salah.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-serif">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center text-navy-900 font-extrabold text-xl select-none">
            T
          </div>
          <div>
            <p className="text-navy-900 font-bold tracking-widest text-base uppercase">Trinova</p>
            <p className="text-slate-400 text-[10px] tracking-[3px] uppercase">Business Suite</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-navy-900 mb-1">Masuk ke Sistem</h1>
          <p className="text-sm text-slate-400 mb-6">Gunakan akun yang diberikan oleh admin.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all bg-white"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all bg-white"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>
        </div>

        {/* Dev hint */}
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-500 mb-2">Demo credentials:</p>
          <p>admin / admin123 → Semua modul</p>
          <p>penjualan / sales123 → Modul Penjualan saja</p>
          <p>pembelian / beli123 → Modul Pembelian saja</p>
          <p>persediaan / gudang123 → Modul Persediaan saja</p>
        </div>

      </div>
    </div>
  );
}
