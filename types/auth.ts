export type Role = "admin" | "penjualan" | "pembelian" | "persediaan" | "procurement_manager";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  token: string;
  refreshToken?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  isLoading: boolean;
}
