import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: tambah token kalau ada ──────────────────────────────
api.interceptors.request.use((config) => {
  // Nanti tambahkan token di sini:
  // const token = getCookie("token");
  // if (token) config.headers.Authorization = `Bearer ${token}`;
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
