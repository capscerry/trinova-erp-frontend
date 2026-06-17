"use client";

import { SalesOrderModal } from "@/components/modules/penjualan/SalesOrderModal";
import { UangMukaModal } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import { PengirimanModal } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import {
  useWorkflowDraft,
  type DraftKey,
} from "@/lib/WorkflowDraftContext";

import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaType";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";

export function TransactionOrchestrator() {
  const {
    draft,
    setDraftPart,
    activeModal,
    openModal,
    closeModal,
    hasDraftPart,
  } = useWorkflowDraft();

  const isSaved = (key: DraftKey) => hasDraftPart(key);

  const getSalesOrderTotal = (so: any): number => {
    const directTotal = Number(
      so.totalHargaPesanan ??
        so.total ??
        so.subTotal ??
        so.subtotal ??
        so.totalAmount ??
        0
    );

    if (directTotal > 0) return directTotal;

    return Number(
      (so.items ?? []).reduce((sum: number, item: any) => {
        const itemTotal = Number(
          item.subtotal ??
            item.totalPrice ??
            item.total ??
            Number(item.qty ?? item.quantity ?? 0) *
              Number(item.harga ?? item.unitPrice ?? item.price ?? 0)
        );

        return sum + itemTotal;
      }, 0)
    );
  };

  // ── Sales Order ────────────────────────────────────────────────────────────
  const handleSONavigate = (
    target: "uang-muka" | "pengiriman" | "faktur",
    data: SalesOrderFormData & { [key: string]: any }
  ) => {
    setDraftPart("salesOrder", data);

    if (target === "uang-muka") openModal("uangMuka");
    if (target === "pengiriman") openModal("pengiriman");
    if (target === "faktur") openModal("faktur");
  };

  // ── Uang Muka ─────────────────────────────────────────────────────────────
  // PENTING: onSubmit HANYA menyimpan draft. Modal Uang Muka sendiri yang
  // mengatur kapan dirinya boleh ditutup (lewat tombol "Tutup" setelah saved,
  // atau "Batal" sebelum saved). Jangan panggil closeModal() di sini —
  // itu menyebabkan modal hilang dari DOM tepat saat baru selesai submit,
  // sehingga user tidak pernah melihat status "tersimpan" dan tombol
  // "Proses ke Penerimaan/Pengiriman" tidak pernah terlihat aktif.
  const handleUMSubmit = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
  };

  // Dipanggil saat modal Uang Muka benar-benar ditutup (tombol X / Batal /
  // Tutup / backdrop). Di sinilah tempat yang tepat untuk closeModal().
  const handleUMClose = () => {
    closeModal();
  };

  const handleUMProses = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    openModal("pengiriman");
  };

  // ── Pengiriman ────────────────────────────────────────────────────────────
  // Sama seperti Uang Muka: onSubmit tidak menutup modal.
  const handlePengirimanSubmit = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
  };

  const handlePengirimanClose = () => {
    closeModal();
  };

  const handlePengirimanProses = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    openModal("faktur");
  };

  const so = draft.salesOrder as
    | (Partial<SalesOrderFormData> & { [key: string]: any })
    | undefined;

  // ── initialData Uang Muka dari Sales Order ─────────────────────────────────
  const uangMukaInitialData: Partial<UangMukaFormData> | undefined =
    draft.uangMuka ??
    (so
      ? {
          id: 0,

          customerId: Number(so.customerId ?? so.customer_id ?? 0) || undefined,
          pelanggan: so.pelanggan ?? so.customerName ?? "",

          noFaktur: "",
          noFakturMode: "auto" as const,
          tanggal: new Date().toISOString().split("T")[0],

          uangMuka: 0,

          noPO: so.noPO ?? so.poNumber ?? "",
          noSo: so.noSo ?? so.nomor ?? so.soNumber ?? so.orderNumber ?? "",
          noPesanan:
            so.noPesanan ?? so.nomor ?? so.soNumber ?? so.orderNumber ?? "",

          kenaPajak: Boolean(so.kenaPajak ?? so.isTaxable ?? false),
          totalTermasukPajak: Boolean(
            so.totalTermasukPajak ?? so.isTaxIncluded ?? true
          ),

          syaratPembayaran: "",

          alamat: so.alamatPengiriman ?? so.address ?? "",
          keterangan: so.keterangan ?? so.notes ?? "",

          fakturType: "Faktur Penjualan",

          totalHargaPesanan: getSalesOrderTotal(so),
        }
      : undefined);

  // ── initialData Pengiriman dari Sales Order ────────────────────────────────
  const pengirimanInitialData: Partial<PengirimanFormData> | undefined =
    draft.pengiriman ??
    (so
      ? {
          id: 0,

          pelanggan: so.pelanggan ?? so.customerName ?? "",

          noSuratJalan: "",
          tanggal: new Date().toISOString().split("T")[0],

          noSO: so.noPesanan ?? so.nomor ?? so.soNumber ?? so.orderNumber ?? "",
          noPO: so.noPO ?? so.poNumber ?? "",

          ekspedisi: "",
          noResi: "",

          alamatPengiriman: so.alamatPengiriman ?? so.address ?? "",
          kotaTujuan: "",

          keterangan: so.keterangan ?? so.notes ?? "",

          fakturType: "Faktur Penjualan",

          items: (so.items ?? []).map((item: any, idx: number) => ({
            id: idx + 1,
            kodeBarang: item.kode ?? item.kodeBarang ?? item.productCode ?? "",
            namaBarang: item.nama ?? item.namaBarang ?? item.productName ?? "",
            satuan: item.satuan ?? item.unit ?? item.uom ?? "PCS",
            qtyDipesan: Number(item.qty ?? item.quantity ?? item.productQty ?? 0),
            qtyDikirim: 0,
            keterangan: item.keterangan ?? item.notes ?? "",
          })),
        }
      : undefined);

  return (
    <>
      <SalesOrderModal
        open={activeModal === "salesOrder"}
        onClose={closeModal}
        onSubmit={() => {}}
        onNavigate={handleSONavigate}
        initialData={draft.salesOrder}
      />

      <UangMukaModal
        open={activeModal === "uangMuka"}
        onClose={handleUMClose}
        onSubmit={handleUMSubmit}
        onProses={handleUMProses}
        initialData={uangMukaInitialData}
        isSaved={isSaved("uangMuka")}
      />

      <PengirimanModal
        open={activeModal === "pengiriman"}
        onClose={handlePengirimanClose}
        onSubmit={handlePengirimanSubmit}
        onProses={handlePengirimanProses}
        initialData={pengirimanInitialData}
        isSaved={isSaved("pengiriman")}
      />
    </>
  );
}