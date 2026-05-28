import { api, type ApiResponse } from "@/lib/api";

// ─── API TYPES ────────────────────────────────────────────────────────────────

export interface MasterUserApi {
  id: number;
  username: string;
  email: string;
  roleName: string;
  password?: string;
  status: boolean;
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

// ─── FRONTEND TYPES ───────────────────────────────────────────────────────────

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

// ─── MAPPERS ──────────────────────────────────────────────────────────────────

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

// ─── SERVICES ─────────────────────────────────────────────────────────────────

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