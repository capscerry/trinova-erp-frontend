import { api, type ApiResponse } from "@/lib/api";

export interface CustomerApi {
  customerId: number;
  customerCode: string;
  customerName: string;
  email: string;
  noTelpBisnis: string;
  alamat: string;
  isActive: boolean;
  categoryName?: string;
  categoryId?: number | null;
}

export interface Customer {
  id: number;
  kode: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  status: string;
  category: string;
  categoryId?: number | null;
}

export interface CustomerPayload {
  customerCode: string;
  customerName: string;
  email: string;
  noTelpBisnis: string;
  alamat: string;
  isActive: boolean;
  categoryId?: number;
}

export function mapCustomer(item: CustomerApi): Customer {
  return {
    id: item.customerId,
    kode: item.customerCode,
    nama: item.customerName,
    email: item.email,
    telepon: item.noTelpBisnis,
    alamat: item.alamat,
    status: item.isActive ? "Aktif" : "Nonaktif",
    category: item.categoryName ?? "-",
    categoryId: item.categoryId ?? null,
  };
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const res = await api.get<ApiResponse<CustomerApi[]>>("/customer");
    return (res.data.data ?? []).map(mapCustomer);
  },

  async getAllActive() : Promise<Customer[]> {
    const res = await api.get<ApiResponse<CustomerApi[]>>("/customer/active");
    return (res.data.data ?? []).map(mapCustomer);
  },

  async getByCode(code: string): Promise<Customer> {
    const res = await api.get<ApiResponse<CustomerApi>>(`/customer/${code}`);
    return mapCustomer(res.data.data);
  },

  async create(payload: CustomerPayload): Promise<void> {
    await api.post("/customer", payload);
  },

  async update(code: string, payload: CustomerPayload): Promise<void> {
    await api.put(`/customer/${code}`, payload);
  },

  async remove(code: string): Promise<void> {
    await api.delete(`/customer/${code}`);
  },
};