import { api } from "../api";

// ─── Types (respons dari GET /api/purchase-order/{id}/detail) ───────────────
// Catatan: field header/supplier tetap snake_case karena model backend-nya
// (PurchaseOrder & Supplier) memang snake_case (mapping langsung ke kolom
// tabel), sedangkan detail item pakai camelCase karena DTO baru
// (PurchaseOrderDetailWithProductDTO) ditulis PascalCase di C#.

export interface PurchaseOrderPrintHeader {
  purchase_order_id: number;
  po_number: string;
  supplier_id: number;
  order_date?: string | null;
  status?: string | null;
  tax_percentage?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  transaction_name?: string | null;
  transaction_detail?: string | null;
  expected_date?: string | null;
  nomor_faktur_pajak?: string | null;
}

export interface PurchaseOrderPrintSupplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  no_telp_bisnis?: string | null;
  alamat?: string | null;
  email?: string | null;
}

export interface PurchaseOrderPrintDetailItem {
  productId: number;
  productCode?: string | null;
  productName?: string | null;
  quantity: number;
  uomCode?: string | null;
  price: number;
  taxAmount?: number | null;
  subtotal: number;
}

export interface PurchaseOrderPrintDetail {
  header: PurchaseOrderPrintHeader;
  supplier: PurchaseOrderPrintSupplier | null;
  details: PurchaseOrderPrintDetailItem[];
}

/** Ambil detail lengkap PO (header + supplier + item ber-nama produk) untuk halaman Print & lampiran PDF email. */
export const getPurchaseOrderPrintDetail = async (
  id: number
): Promise<PurchaseOrderPrintDetail> => {
  const res = await api.get(`/purchase-order/${id}/detail`);
  return res.data?.data ?? res.data;
};

/**
 * Kirim PO ke email supplier terdaftar (SMTP di backend).
 * `attachment` adalah PDF hasil render halaman Print di sisi frontend
 * (lihat lib/pdf/purchaseOrderPdf.tsx).
 */
export const sendPurchaseOrderEmail = async (
  id: number,
  message?: string,
  attachment?: { base64: string; fileName: string }
): Promise<string> => {
  const res = await api.post(`/purchase-order/${id}/send-email`, {
    message: message && message.length > 0 ? message : undefined,
    attachmentBase64: attachment?.base64,
    attachmentFileName: attachment?.fileName,
  });

  return res.data?.message ?? "Email Purchase Order berhasil dikirim.";
};
