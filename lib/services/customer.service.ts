import { api, type ApiResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape yang datang dari API */
export interface CustomerApi {
  customerCode: string;
  customerName: string;
  email: string;
  noTelpBisnis: string;
  alamat: string;
  isActive: boolean;
  categoryName?: string;
  categoryId?: number;
}

/** Shape yang dipakai di UI */
export interface Customer {
  kode: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  status: string;
  category: string;
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

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapCustomer(item: CustomerApi): Customer {
  return {
    kode: item.customerCode,
    nama: item.customerName,
    email: item.email,
    telepon: item.noTelpBisnis,
    alamat: item.alamat,
    status: item.isActive ? "Aktif" : "Nonaktif",
    category: item.categoryName ?? "-",
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const customerService = {
  /** Ambil semua customer */
  async getAll(): Promise<Customer[]> {
    const res = await api.get<ApiResponse<CustomerApi[]>>("/customer");
    return (res.data.data ?? []).map(mapCustomer);
  },

  /** Ambil satu customer berdasarkan kode */
  async getByCode(code: string): Promise<Customer> {
    const res = await api.get<ApiResponse<CustomerApi>>(`/customer/${code}`);
    return mapCustomer(res.data.data);
  },

  /** Tambah customer baru */
  async create(payload: CustomerPayload): Promise<void> {
    await api.post("/customer", payload);
  },

  /** Update customer */
  async update(code: string, payload: CustomerPayload): Promise<void> {
    await api.put(`/customer/${code}`, payload);
  },

  /** Hapus customer */
  async remove(code: string): Promise<void> {
    await api.delete(`/customer/${code}`);
  },
};
