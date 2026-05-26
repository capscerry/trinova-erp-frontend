"use client";

import { SalesOrderModal } from "@/components/modules/penjualan/SalesOrderModal";
import { UangMukaModal } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import { PengirimanModal } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import { useWorkflowDraft, type DraftKey } from "@/lib/WorkflowDraftContext";
import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";

export function TransactionOrchestrator() {
  const { draft, setDraftPart, activeModal, openModal, closeModal, hasDraftPart } =
    useWorkflowDraft();

  const isSaved = (key: DraftKey) => hasDraftPart(key);

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
  const handleUMSubmit = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    closeModal();
  };

  const handleUMProses = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    openModal("pengiriman");
  };

  // ── Pengiriman ────────────────────────────────────────────────────────────
  const handlePengirimanSubmit = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    closeModal();
  };

  const handlePengirimanProses = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    openModal("faktur");
  };

  // ── initialData Uang Muka (pre-fill dari SO) ───────────────────────────────
  const so = draft.salesOrder;
  const uangMukaInitialData: Partial<UangMukaFormData> | undefined =
    draft.uangMuka ??
    (so
      ? {
          id: 0,
          // ✓ CRITICAL: Map customerId dari Sales Order
          customerId: Number(so.customerId) || 0,
          pelanggan: so.pelanggan ?? "",
          noFaktur: "",
          noFakturMode: "auto" as const,
          tanggal: new Date().toISOString().split("T")[0],
          uangMuka: 0,
          noPO: so.noPO?? "",
          noSo: so.nomor ?? "",
          kenaPajak: so.kenaPajak ?? false,
          totalTermasukPajak: true,
          syaratPembayaran: "",
          alamat: so.alamatPengiriman ?? "",
          keterangan: "",
          fakturType: "Faktur Penjualan",
          noPesanan: so.noPesanan ?? so.nomor ?? "",
          totalHargaPesanan: Number(so.totalHargaPesanan ?? 0),
        }
      : undefined);

  // ── initialData Pengiriman (pre-fill dari SO) ──────────────────────────────
  const pengirimanInitialData: Partial<PengirimanFormData> | undefined =
    draft.pengiriman ??
    (so
      ? {
          id: 0,
          pelanggan: so.pelanggan ?? "",
          noSuratJalan: "",
          tanggal: new Date().toISOString().split("T")[0],
          noSO: so.noPesanan ?? so.nomor ?? "",
          noPO: "",
          ekspedisi: "",
          noResi: "",
          alamatPengiriman: so.alamatPengiriman ?? "",
          kotaTujuan: "",
          keterangan: so.keterangan ?? "",
          fakturType: "Faktur Penjualan",
          items: (so.items ?? []).map((item: any, idx: number) => ({
            id: idx + 1,
            kodeBarang: item.kode ?? item.kodeBarang ?? "",
            namaBarang: item.nama ?? item.namaBarang ?? "",
            satuan: item.satuan ?? "PCS",
            qtyDipesan: item.qty ?? item.quantity ?? 0,
            qtyDikirim: 0,
            keterangan: "",
          })),
        }
      : undefined);

  return (
    <>
      <SalesOrderModal
        open={activeModal === "salesOrder"}
        onClose={closeModal}
        onSubmit={() => {}} // SO save ke API sendiri di dalam modal
        onNavigate={handleSONavigate}
        initialData={draft.salesOrder}
      />

      <UangMukaModal
        open={activeModal === "uangMuka"}
        onClose={closeModal}
        onSubmit={handleUMSubmit}
        onProses={handleUMProses}
        initialData={uangMukaInitialData}
        isSaved={isSaved("uangMuka")}
      />

      <PengirimanModal
        open={activeModal === "pengiriman"}
        onClose={closeModal}
        onSubmit={handlePengirimanSubmit}
        onProses={handlePengirimanProses}
        initialData={pengirimanInitialData}
        isSaved={isSaved("pengiriman")}
      />
    </>
  );
}