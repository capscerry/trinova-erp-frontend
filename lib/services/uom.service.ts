import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Uom {
  uom_id: number;
  uom_code: string;
  uom_name: string;
}

// ─── GET UOMS ─────────────────────────────────────────────────────────────────
export async function getUoms() {
  const response = await api.get(
    "/MasterUom/GetAllMasterUom"
  );

  return response.data.data;
}
