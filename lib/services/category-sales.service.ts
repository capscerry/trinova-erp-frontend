import { api } from "@/lib/api";

export interface SalesCategoryApi {
  id: number;
  namaKategori: string;
  keterangan?: string | null;
  isActive: boolean;
}

export interface KategoriPenjualan {
  no: string;
  id: number;
  nama: string;
  keterangan: string;
  isActive: boolean;
}

export interface KategoriPenjualanPayload {
  NamaKategori: string;
  Keterangan: string;
}

export interface ToggleSalesCategoryStatusPayload {
  isActive: boolean;
}

export function mapKategoriPenjualan(
  item: SalesCategoryApi,
  index: number
): KategoriPenjualan {
  return {
    no: (index + 1).toString(),
    id: item.id,
    nama: item.namaKategori,
    keterangan: item.keterangan ?? "",
    isActive: Boolean(item.isActive),
  };
}

export const categorySalesService = {
  async getAll(): Promise<KategoriPenjualan[]> {
    const res = await api.get("/api/sales-category");
    return (res.data.data ?? []).map(
      (item: SalesCategoryApi, index: number) =>
        mapKategoriPenjualan(item, index)
    );
  },

  async create(payload: KategoriPenjualanPayload): Promise<string> {
    const res = await api.post("/api/sales-category", payload);
    return res.data.message ?? res.data ?? "Kategori berhasil ditambahkan";
  },

  async update(id: number, payload: KategoriPenjualanPayload): Promise<string> {
    const res = await api.put(`/api/sales-category/${id}`, payload);
    return res.data.message ?? "Kategori berhasil diupdate";
  },

  async toggleStatus(
    id: number,
    payload: ToggleSalesCategoryStatusPayload
  ): Promise<string> {
    const res = await api.post(`/api/sales-category/${id}/status`, payload);
    return res.data.message ?? "Status berhasil diubah";
  },
};
