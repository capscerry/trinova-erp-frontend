"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";

/**
 * Workflow Draft — central state untuk transaksi multi-step di modul Penjualan.
 *
 * Pattern: data dari setiap modal (SO → Uang Muka → Pengiriman → Faktur) di-buffer
 * di sini sebagai "draft", BUKAN langsung di-insert ke database. User bisa loncat
 * antar modal dengan bebas urutannya. Insert ke DB hanya terjadi saat `submitAll()`
 * dipanggil.
 *
 * Cara menambah modal baru (mis. Faktur):
 *   1. Tambah field `faktur?: FakturFormData` di interface `WorkflowDraft`
 *   2. Tambah "faktur" di union type `ModalKey`
 *   3. Tambah handler & render <FakturModal /> di TransactionOrchestrator
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkflowDraft {
  salesOrder?: SalesOrderFormData;
  uangMuka?: UangMukaFormData;
  pengiriman?: PengirimanFormData;
  // faktur?: FakturFormData;
}

export type DraftKey = keyof WorkflowDraft;

// Sesuaikan dengan key di PROSES_LINKS (SalesOrderType.ts) bila perlu
export type ModalKey =
  | "salesOrder"
  | "uangMuka"
  | "pengiriman"
  | "faktur"
  | null;

interface WorkflowDraftContextValue {
  /** Snapshot semua draft saat ini */
  draft: WorkflowDraft;

  /** Update salah satu form di draft */
  setDraftPart: <K extends DraftKey>(key: K, data: WorkflowDraft[K]) => void;

  /** Hapus salah satu bagian draft */
  clearDraftPart: (key: DraftKey) => void;

  /** Hapus seluruh draft (mis. setelah submit sukses / user cancel total) */
  clearDraft: () => void;

  /** Cek apakah form tertentu sudah pernah diisi — untuk enable tombol Proses */
  hasDraftPart: (key: DraftKey) => boolean;

  /** Modal mana yang sedang dibuka */
  activeModal: ModalKey;
  openModal: (key: ModalKey) => void;
  closeModal: () => void;

  /** Commit semua draft ke database (atomic) */
  submitAll: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}

const WorkflowDraftContext = createContext<WorkflowDraftContextValue | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface ProviderProps {
  children: ReactNode;
  /**
   * Function yang benar-benar nge-hit API. Halaman yang implement.
   * Kalau ada kegagalan, throw Error supaya state submitError terisi.
   */
  onCommit: (draft: WorkflowDraft) => Promise<void>;
}

export function WorkflowDraftProvider({ children, onCommit }: ProviderProps) {
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

  const clearDraftPart = useCallback((key: DraftKey) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    setDraft({});
    setSubmitError(null);
  }, []);

  const hasDraftPart = useCallback(
    (key: DraftKey) => draft[key] !== undefined,
    [draft]
  );

  const openModal = useCallback((key: ModalKey) => setActiveModal(key), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const submitAll = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onCommit(draft);
      // bersihkan draft setelah sukses
      setDraft({});
      setActiveModal(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan";
      setSubmitError(msg);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [draft, onCommit]);

  return (
    <WorkflowDraftContext.Provider
      value={{
        draft,
        setDraftPart,
        clearDraftPart,
        clearDraft,
        hasDraftPart,
        activeModal,
        openModal,
        closeModal,
        submitAll,
        submitting,
        submitError,
      }}
    >
      {children}
    </WorkflowDraftContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWorkflowDraft() {
  const ctx = useContext(WorkflowDraftContext);
  if (!ctx) {
    throw new Error(
      "useWorkflowDraft must be used within WorkflowDraftProvider"
    );
  }
  return ctx;
}
