"use client";

import { SalesOrderModal } from "@/components/modules/penjualan/SalesOrderModal";
import { UangMukaModal } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import { PengirimanModal } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import {
  useWorkflowDraft,
  type DraftKey,
} from "@/lib/WorkflowDraftContext";
import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";

/**
 * TransactionOrchestrator — render semua modal workflow di satu tempat dan
 * wire ke draft store.
 *
 * Aturan:
 *  - `onSubmit` modal       ⇒ simpan ke draft + close modal (TIDAK ada API call)
 *  - `onNavigate`/`onProses` ⇒ simpan ke draft + buka modal berikutnya
 *  - `initialData` modal    ⇒ baca dari draft (modal jadi controlled by draft)
 *  - `isSaved`/`savedId`    ⇒ tombol "Proses ke X" aktif kalau bagian draft sudah ada
 */
export function TransactionOrchestrator() {
  const {
    draft,
    setDraftPart,
    activeModal,
    openModal,
    closeModal,
    hasDraftPart,
  } = useWorkflowDraft();

  // Helper: sebuah "bagian" dianggap saved kalau sudah ada di draft (in-memory)
  const isSaved = (key: DraftKey) => hasDraftPart(key);

  // ── Sales Order ─────────────────────────────────────────────────────────
  const handleSOSubmit = (data: SalesOrderFormData) => {
    setDraftPart("salesOrder", data);
    closeModal();
  };

  const handleSONavigate = (
    target: "uang-muka" | "pengiriman" | "faktur",
    data: SalesOrderFormData
  ) => {
    // simpan dulu SO ke draft
    setDraftPart("salesOrder", data);
    // baru loncat ke modal berikutnya
    if (target === "uang-muka") openModal("uangMuka");
    else if (target === "pengiriman") openModal("pengiriman");
    else if (target === "faktur") openModal("faktur");
  };

  // ── Uang Muka ───────────────────────────────────────────────────────────
  const handleUMSubmit = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    closeModal();
  };

  const handleUMProses = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    openModal("pengiriman");
  };

  // ── Pengiriman ──────────────────────────────────────────────────────────
  const handlePengirimanSubmit = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    closeModal();
  };

  const handlePengirimanProses = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    // Default: lanjut ke faktur (jika sudah ada modalnya)
    openModal("faktur");
  };

  const uangMukaInitialData = draft.uangMuka ?? (
    draft.salesOrder ? {
      id : 0,
      pelanggan: draft.salesOrder.pelanggan,
      noFaktur: "",
      tanggal: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
      uangMuka: 0,
      noPO: "",
      kenaPajak: draft.salesOrder.kenaPajak ?? false,
      totalTermasukPajak: draft.salesOrder.totalTermasukPajak ?? true,
      syaratPembayaran: "",
      alamat: draft.salesOrder.alamatPengiriman,
      keterangan: "",
      fakturType: "Faktur Penjualan",
    } : undefined
  );

  return (
    <>
      <SalesOrderModal
        open={activeModal === "salesOrder"}
        onClose={closeModal}
        onSubmit={handleSOSubmit}
        onNavigate={handleSONavigate}
        initialData={draft.salesOrder}
        savedId="draft"
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
        initialData={draft.pengiriman}
        isSaved={isSaved("pengiriman")}
      />

      {/* Tambah FakturModal dst di sini saat sudah siap */}
    </>
  );
}
