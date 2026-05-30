"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";

import {
  getTransfers,
  transferStock,
} from "@/lib/services/stock-transfer.service";

import StockTransferForm, {
  StockTransferFormData,
} from "@/components/modules/persediaan/stock-transfer/StockTransferForm";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type POStatus =
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Cancelled";

interface StokTransfer {
  id: string;
  nomor: string;
  tanggal: string;
  tipe_transfer: string;
  gudang_tujuan: string;
  gudang_asal: string;
  keterangan: string;
  status: POStatus;
}

interface StockTransferApi {
  movement_id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  reference_number: string;
  notes: string;
  movement_date: string;
  source_warehouse_id: number;
  destination_warehouse_id: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  POStatus,
  string
> = {
  "Waiting to be processed":
    "bg-amber-50 text-amber-700 border border-amber-200",

  Processed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  "Partially processed":
    "bg-blue-50 text-blue-700 border border-blue-200",

  Cancelled:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function POStatusBadge({
  status,
}: {
  status: POStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────

const COLUMNS: Column<StokTransfer>[] =
  [
    {
      key: "nomor",
      label: "Number #",
      width: "180px",

      render: (val) => (
        <span className="font-mono font-semibold text-[12px] text-navy-700">
          {String(val)}
        </span>
      ),
    },

    {
      key: "tanggal",
      label: "Date",
      width: "120px",

      render: (val) => (
        <span className="text-slate-600 whitespace-nowrap">
          {formatDate(String(val))}
        </span>
      ),
    },

    {
      key: "tipe_transfer",
      label: "Transfer Type",
      width: "180px",

      render: (val) => (
        <span className="font-medium text-slate-700">
          {String(val)}
        </span>
      ),
    },

    {
      key: "gudang_tujuan",
      label:
        "Destination Warehouse",
      width: "220px",

      render: (val) => (
        <span className="font-medium text-slate-700">
          {String(val)}
        </span>
      ),
    },

    {
      key: "gudang_asal",
      label: "Source Warehouse",
      width: "220px",

      render: (val) => (
        <span className="font-medium text-slate-700">
          {String(val)}
        </span>
      ),
    },

    {
      key: "keterangan",
      label: "Keterangan",

      render: (val) => (
        <span className="text-slate-500 text-xs">
          {String(val) || "—"}
        </span>
      ),
    },

    {
      key: "status",
      label: "Status",
      width: "180px",

      render: (val) => (
        <POStatusBadge
          status={val as POStatus}
        />
      ),
    },
  ];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function StokTransferPage() {
  const [transfers, setTransfers] =
    useState<StokTransfer[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const data: StockTransferApi[] =
        await getTransfers();

      const mapped: StokTransfer[] =
        data.map((item) => ({
          id:
            item.movement_id.toString(),

          nomor:
            item.reference_number,

          tanggal:
            item.movement_date,

          tipe_transfer:
            item.movement_type,

          gudang_tujuan:
            `Warehouse ${item.destination_warehouse_id}`,

          gudang_asal:
            `Warehouse ${item.source_warehouse_id}`,

          keterangan:
            item.notes,

          status:
            "Processed",
        }));

      setTransfers(mapped);
    } catch (error) {
      console.error(
        "Failed to load transfers",
        error
      );
    }
  };

  const handleCreateTransfer =
    async (
      data: StockTransferFormData
    ) => {
      try {
        setSaving(true);

        await transferStock({
          ...data,
          created_by: "admin",
        });

        setOpenModal(false);

        await loadTransfers();
      } catch (error) {
        console.error(error);

        alert(
          "Failed to create transfer"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <AppShell
      title="Stock Transfer"
      subtitle="Kelola pesanan transfer stok"
    >
      <DataTable<StokTransfer>
        title="Daftar Stock Transfer"
        columns={COLUMNS}
        data={transfers}
        addLabel="Tambah Stock Transfer"
        onAdd={() =>
          setOpenModal(true)
        }
        keyField="id"
      />

      <Modal
        isOpen={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        title="Tambah Stock Transfer"
      >
        <StockTransferForm
          loading={saving}
          onSubmit={
            handleCreateTransfer
          }
        />
      </Modal>
    </AppShell>
  );
}