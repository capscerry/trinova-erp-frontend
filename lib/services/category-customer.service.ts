import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape dari API */
export interface CategoryCustomerApi {
  id: number;
  namaKategori: string;
  isActive: boolean;
}

/** Shape yang dipakai di UI */
export interface KategoriCustomer {
  no: string;
  id: number;
  nama: string;
  isActive: boolean;
}

export interface KategoriCustomerPayload {
  NamaKategori: string;
}

export interface ToggleStatusPayload {
  isActive: boolean;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapKategoriCustomer(
  item: CategoryCustomerApi,
  index: number
): KategoriCustomer {
  return {
    no: (index + 1).toString(),
    id: item.id,
    nama: item.namaKategori,
    isActive: Boolean(item.isActive),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const categoryCustomerService = {
  async getAll(): Promise<KategoriCustomer[]> {
    const res = await api.get("/api/category-customer");
    return (res.data.data ?? []).map(
      (item: CategoryCustomerApi, index: number) =>
        mapKategoriCustomer(item, index)
    );
  },

  async create(payload: KategoriCustomerPayload): Promise<string> {
    const res = await api.post("/api/category-customer", payload);
    return res.data.message ?? "Kategori berhasil ditambahkan";
  },

  async update(id: number, payload: KategoriCustomerPayload): Promise<string> {
    const res = await api.put(`/api/category-customer/${id}`, payload);
    return res.data.message ?? "Kategori berhasil diupdate";
  },

  async toggleStatus(id: number, payload: ToggleStatusPayload): Promise<string> {
    const res = await api.post(`/api/category-customer/${id}/status`, payload);
    return res.data.message ?? "Status berhasil diubah";
  },
};
