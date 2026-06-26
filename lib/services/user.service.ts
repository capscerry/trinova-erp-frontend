import { api, type ApiResponse } from "@/lib/api";
import type { AuthUser, Role } from "@/types/auth";

export interface MasterUserApi {
  id: number;
  username: string;
  email: string;
  roleName: string;
  password?: string;
  status: boolean;
}

export interface LoginApi {
  email: string;
  password: string;
}

export interface LoginResponseApi {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    roleName: string;
  };
}

export interface MasterRoleApi {
  id: number;
  name: string;
  isActive: boolean;
}

export interface CreateMasterUserPayload {
  username: string;
  email: string;
  roleId: number;
  password: string;
  status: boolean;
}

export interface UpdateMasterUserPayload {
  id: number;
  email: string;
  roleId: number;
}

export interface MasterRole {
  id: number;
  roleName: string;
  status: boolean;
}

export interface MasterUser {
  id: number;
  username: string;
  email: string;
  role: string;
  status: boolean;
}

function mapBackendRole(roleName: string): Role {
  const role = roleName.toLowerCase().trim();

  switch (role) {
    case "admin":
      return "admin";

    case "sales":
      return "penjualan";

    case "purchasing":
      return "pembelian";

    case "inventory":
    case "warehouse":
    case "persediaan":
      return "persediaan";

    default:
      return "penjualan";
  }
}

export function mapMasterUser(item: MasterUserApi): MasterUser {
  return {
    id: item.id,
    username: item.username,
    email: item.email,
    role: item.roleName,
    status: item.status,
  };
}

export function mapMasterRole(item: MasterRoleApi): MasterRole {
  return {
    id: item.id,
    roleName: item.name,
    status: item.isActive,
  };
}

export function mapAuthUser(item: LoginResponseApi): AuthUser {
  const name = item.user.username || item.user.email;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

  return {
    id: item.user.id,
    username: item.user.username,
    name,
    initials,
    email: item.user.email,
    role: mapBackendRole(item.user.roleName),
    token: item.token,
  };
}

export const masterUserService = {
  async getAll(): Promise<MasterUser[]> {
    const response = await api.get<ApiResponse<MasterUserApi[]>>("/user-list");
    return (response.data.data ?? []).map(mapMasterUser);
  },

  async create(payload: CreateMasterUserPayload): Promise<boolean> {
    const response = await api.post<ApiResponse<boolean>>(
      "/create-user",
      payload
    );

    return response.data.data ?? false;
  },

  async update(payload: UpdateMasterUserPayload): Promise<boolean> {
    const response = await api.put<ApiResponse<boolean>>(
      "/update-user",
      payload
    );

    return response.data.data ?? false;
  },

  async toggleStatus(id: number): Promise<boolean> {
    const response = await api.put<ApiResponse<boolean>>(
      `/toggle-user-status/${id}`
    );

    return response.data.data ?? false;
  },
};

export const roleService = {
  async getAll(): Promise<MasterRole[]> {
    const response = await api.get<ApiResponse<MasterRoleApi[]>>("/role-list");
    return (response.data.data ?? []).map(mapMasterRole);
  },
};

export const authService = {
  async login(payload: LoginApi): Promise<AuthUser> {
    const response = await api.post<ApiResponse<LoginResponseApi>>(
      "/auth/login",
      payload
    );

    if (!response.data.data) {
      throw new Error(response.data.message ?? "Login gagal");
    }

    return mapAuthUser(response.data.data);
  },
};
