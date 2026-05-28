import { api, type ApiResponse } from "@/lib/api";


export interface MasterUserApi {
  id: number;
  username: string;
  email: string;
  roleName: string;
  password: string;
  status: boolean;
}

export interface MasterRoleApi{
    id : number;
    name: string;
    isActive : boolean;
}

export interface MasterRole{
    id : number ;
    roleName : string;
    status : boolean;
}

export interface MasterUser{
    id : number;
    username : string;
    email : string;
    role : string;
    status : boolean;
}

export function mapMasterUser(item : MasterUserApi) : MasterUser{
    return{
        id : item.id,
        username : item.username,
        email : item.email,
        role : item.roleName,
        status : item.status,
    };
}

export function mapMasterRole(item : MasterRoleApi) : MasterRole{
    return{
        id : item.id,
        roleName : item.name,
        status : item.isActive,
    }
}

export const masterUserService = {
    async getAll(): Promise<MasterUser[]>{
        const response = await api.get<ApiResponse<MasterUserApi[]>>(
            "/user-list"
        );
        return (response.data.data ?? []).map(mapMasterUser);
    }
}

export const roleService = {
    async getAll(): Promise<MasterRole[]>   {
        const response = await api.get<ApiResponse<MasterRoleApi[]>>("/role-list")
        return (response.data.data ?? []).map(mapMasterRole);
    }
}