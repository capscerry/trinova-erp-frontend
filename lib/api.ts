import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

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
        // Ignore invalid session user data; request can still continue without actor headers.
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    let body: unknown = config.data;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // Leave non-JSON strings as-is for logging.
      }
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, JSON.stringify(body, null, 2));
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data;

    if (process.env.NODE_ENV === "development") {
      console.error(
        `[API Error] ${err.config?.method?.toUpperCase()} ${err.config?.url}`,
        "status:",
        err.response?.status,
        "body:",
        JSON.stringify(data, null, 2)
      );
    }

    // If the server returns 401, the token is missing or expired.
    // Clear the stale session and redirect to login so the user can re-authenticate.
    // Skip this for the login endpoint itself — a 401 there means wrong credentials,
    // not an expired session, so we let the error propagate normally to the login form.
    if (err.response?.status === 401 && typeof window !== "undefined" && !err.config?.url?.includes("/auth/login")) {
      sessionStorage.removeItem("trinova_token");
      sessionStorage.removeItem("trinova_user");
      // Clear the session/role cookies set by AuthContext
      document.cookie = "trinova_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "trinova_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = "/login";
      return Promise.reject(new Error("Sesi habis. Silakan login kembali."));
    }

    if (data?.errors && typeof data.errors === "object") {
      const fieldErrors = Object.entries(data.errors as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
        .join(" | ");
      console.error("[API Validation Errors]", data.errors);
      return Promise.reject(new Error(fieldErrors || data.title || "Validation error"));
    }

    const message = data?.message || data?.title || err.message || "Terjadi kesalahan";
    return Promise.reject(new Error(message));
  }
);

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}
