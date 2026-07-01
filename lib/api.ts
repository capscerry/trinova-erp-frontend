import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: tambah token kalau ada ──────────────────────────────
api.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === "development") {
    let body: any = config.data;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { /* leave as string */ }
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, JSON.stringify(body, null, 2));
  }
  return config;
});

// ─── Response interceptor: normalisasi error ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;

    // Always log the full raw response in development for easier debugging
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[API Error] ${err.config?.method?.toUpperCase()} ${err.config?.url}`,
        "status:", err.response?.status,
        "body:", JSON.stringify(data, null, 2)
      );
    }

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
