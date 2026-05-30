export type Role = "admin" | "penjualan" | "pembelian" | "persediaan";

export interface AuthUser {
  id: string;
  name: string;
  initials: string;
  role: Role;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}
