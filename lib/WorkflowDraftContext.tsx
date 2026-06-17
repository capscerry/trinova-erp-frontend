"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SalesOrderFormData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaType";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WorkflowDraft {
  salesOrder?: SalesOrderFormData & { [key: string]: any };
  uangMuka?: UangMukaFormData;
  pengiriman?: PengirimanFormData;
}

export type DraftKey = keyof WorkflowDraft;

export type ModalKey =
  | "salesOrder"
  | "uangMuka"
  | "pengiriman"
  | "faktur"
  | null;

interface WorkflowDraftContextValue {
  draft: WorkflowDraft;
  setDraftPart: <K extends DraftKey>(key: K, data: WorkflowDraft[K]) => void;
  hasDraftPart: (key: DraftKey) => boolean;
  activeModal: ModalKey;
  openModal: (key: ModalKey) => void;
  closeModal: () => void;
}

const WorkflowDraftContext = createContext<WorkflowDraftContextValue | undefined>(
  undefined
);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function WorkflowDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<WorkflowDraft>({});
  const [activeModal, setActiveModal] = useState<ModalKey>(null);

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
  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <WorkflowDraftContext.Provider
      value={{ draft, setDraftPart, hasDraftPart, activeModal, openModal, closeModal }}
    >
      {children}
    </WorkflowDraftContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWorkflowDraft() {
  const ctx = useContext(WorkflowDraftContext);
  if (!ctx) throw new Error("useWorkflowDraft must be used within WorkflowDraftProvider");
  return ctx;
}