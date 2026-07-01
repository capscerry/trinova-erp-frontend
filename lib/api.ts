import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: tambah token kalau ada ──────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("trinova_token");
    const savedUser = sessionStorage.getItem("trinova_user");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as { id?: number; username?: string; email?: string };
        if (user.id) config.headers["X-User-Id"] = String(user.id);
        if (user.username || user.email) config.headers["X-User-Name"] = user.username ?? user.email;
      } catch {
        // Abaikan session user yang tidak valid; request tetap dikirim tanpa actor header.
      }
    }
  }

  return config;
});

// ─── Response interceptor: normalisasi error ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      "Terjadi kesalahan";
    return Promise.reject(new Error(message));
  }
);

// ─── Generic response wrapper (sesuaikan dengan shape API kamu) ───────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
