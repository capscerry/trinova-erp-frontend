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
  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data ?? "");
  }
  return config;
});

// ─── Response interceptor: normalisasi error ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;

    // ASP.NET ValidationProblemDetails: surface field-level errors
    if (data?.errors && typeof data.errors === "object") {
      const fieldErrors = Object.entries(data.errors as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join(" | ");
      console.error("[API Validation Errors]", data.errors);
      return Promise.reject(new Error(fieldErrors || data.title || "Validation error"));
    }

    const message =
      data?.message ||
      data?.title ||
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
