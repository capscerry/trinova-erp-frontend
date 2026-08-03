"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaType";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanType";
import type { FakturPenjualanFormData } from "@/components/modules/penjualan/faktur_penjualan/FakturPenjualanType";
import type { PenerimaanFormData } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanPenjualanType";

export interface WorkflowDraft {
  salesOrder?: SalesOrderFormData & Record<string, unknown>;
  uangMuka?: UangMukaFormData;
  pengiriman?: PengirimanFormData;
  faktur?: FakturPenjualanFormData;
  penerimaan?: PenerimaanFormData;
}

export type DraftKey = keyof WorkflowDraft;

export type ModalKey =
  | "salesOrder"
  | "uangMuka"
  | "pengiriman"
  | "faktur"
  | "penerimaan"
  | null;

interface WorkflowDraftContextValue {
  draft: WorkflowDraft;
  setDraftPart: <K extends DraftKey>(key: K, data: WorkflowDraft[K]) => void;
  hasDraftPart: (key: DraftKey) => boolean;
  activeModal: ModalKey;
  openModal: (key: ModalKey) => void;
  closeModal: () => void;
  submitAll: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  clearDraft: () => void;
}

const WorkflowDraftContext = createContext<WorkflowDraftContextValue | undefined>(
  undefined
);

// Setiap modal di chain SO -> Uang Muka/Faktur -> Pengiriman/Penerimaan
// "milik" halaman list dokumennya sendiri. Chain-nya sendiri selalu dimulai
// dari /penjualan/order (satu-satunya halaman yang me-render
// WorkflowDraftProvider + TransactionOrchestrator), jadi tanpa redirect user
// akan selalu balik ke situ walau modal yang baru saja ditutup adalah Faktur,
// Uang Muka, dst. -- padahal dokumen barunya ada di halaman lain.
const MODAL_LIST_ROUTE: Partial<Record<Exclude<ModalKey, null>, string>> = {
  uangMuka: "/penjualan/uang-muka",
  pengiriman: "/penjualan/pengiriman-penjualan",
  faktur: "/penjualan/invoice",
  penerimaan: "/penjualan/penerimaan-penjualan",
};

export function WorkflowDraftProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkflowDraft>({});
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setDraftPart = useCallback(
    <K extends DraftKey>(key: K, data: WorkflowDraft[K]) => {
      setDraft((prev) => ({ ...prev, [key]: data }));
    },
    []
  );

  const hasDraftPart = useCallback(
    (key: DraftKey) => draft[key] !== undefined,
    [draft]
  );

  const openModal = useCallback((key: ModalKey) => setActiveModal(key), []);
  const closeModal = useCallback(() => {
    const target = activeModal ? MODAL_LIST_ROUTE[activeModal] : undefined;
    if (target) {
      // Pindah ke halaman list dokumen yang baru saja diproses, supaya
      // list-nya ikut ter-refresh (fetch on mount) dan user tidak nyangkut
      // di /penjualan/order setelah selesai di step Faktur/Uang
      // Muka/Pengiriman/Penerimaan.
      router.push(target);
    }
    setActiveModal(null);
  }, [activeModal, router]);

  const clearDraft = useCallback(() => {
    setDraft({});
    setSubmitError(null);
  }, []);

  const submitAll = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Individual modals handle their own API calls via onSubmit.
      // submitAll is the hook point for callers that want a single
      // "commit everything" action; extend here as needed.
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi"
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return (
    <WorkflowDraftContext.Provider
      value={{
        draft,
        setDraftPart,
        hasDraftPart,
        activeModal,
        openModal,
        closeModal,
        submitAll,
        submitting,
        submitError,
        clearDraft,
      }}
    >
      {children}
    </WorkflowDraftContext.Provider>
  );
}

export function useWorkflowDraft() {
  const ctx = useContext(WorkflowDraftContext);
  if (!ctx) throw new Error("useWorkflowDraft must be used within WorkflowDraftProvider");
  return ctx;
}

