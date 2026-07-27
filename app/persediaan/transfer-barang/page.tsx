"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import StockTransferDetailModal from "@/components/modules/persediaan/stock-transfer/StockTransferDetailFormModal";
import StockTransferForm, {StockTransferFormData,} from "@/components/modules/persediaan/stock-transfer/StockTransferFormModal";

import {
  getTransfers,
  getTransferById,
  transferStock,
  processTransfer,
  completeTransfer,
  cancelTransfer,
} from "@/lib/services/stock-transfer.service";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type TransferStatus =
  | "CREATED"
  | "PROCESSED"
  | "COMPLETED"
  | "CANCELED";

interface StokTransfer {
  id: string;
  nomor: string;
  tanggal: string;
  tipe_transfer: string;
  gudang_tujuan: string;
  gudang_asal: string;
  keterangan: string;
  status: TransferStatus;
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

  source_warehouse_name: string;
  destination_warehouse_name: string;

  status: TransferStatus;
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

const STATUS_STYLE: Record<TransferStatus, string> = {
  CREATED:
    "bg-amber-50 text-amber-700 border border-amber-200",

  PROCESSED:
    "bg-blue-50 text-blue-700 border border-blue-200",

  COMPLETED:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  CANCELED:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function TransferStatusBadge({status,}: {
  status: TransferStatus;
}) {
  const label =
    status.charAt(0) +
    status.slice(1).toLowerCase();

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function StokTransferPage() {
  const [transfers, setTransfers] = useState<StokTransfer[]>([]);

  const [openModal, setOpenModal] = useState(false);

  const [saving, setSaving] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

  const [openDetailModal, setOpenDetailModal] = useState(false);

  useEffect(() => { loadTransfers();}, []);

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
            item.destination_warehouse_name,

          gudang_asal:
            item.source_warehouse_name,

          keterangan:
            item.notes,

          status:
            item.status,
        }));

      setTransfers(mapped);
    } catch (error) {
      console.error(
        "Failed to load transfers",
        error
      );
    }
  };

  const handleView = async (
    id: number
  ) => {
    try {
      const data =
        await getTransferById(id);

      setSelectedTransfer(data);

      setOpenDetailModal(true);
    } catch (err) {
      console.error(err);

      alert(
        "Failed to load transfer detail."
      );
    }
  };

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
        <TransferStatusBadge
          status={val as TransferStatus}
        />
      ),
    },

    {
      key: "id",
      label: "Action",
      width: "120px",

      render: (_, row) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleView(Number(row.id))}
        >
          View
        </Button>
      ),
    },
  ];

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

  const handleProcess = async () => {
    if (!selectedTransfer) return;

    try {
      await processTransfer(
        selectedTransfer.movement_id
      );

      setOpenDetailModal(false);

      await loadTransfers();
    } catch (err) {
      console.error(err);

      alert("Failed to process transfer.");
    }
  };

  const handleComplete = async () => {
    if (!selectedTransfer) return;

    try {
      await completeTransfer(
        selectedTransfer.movement_id
      );

      setOpenDetailModal(false);

      await loadTransfers();
    } catch (err) {
      console.error(err);

      alert("Failed to complete transfer.");
    }
  };

  const handleCancel = async () => {
    if (!selectedTransfer) return;

    try {
      await cancelTransfer(
        selectedTransfer.movement_id
      );

      setOpenDetailModal(false);

      await loadTransfers();
    } catch (err) {
      console.error(err);

      alert("Failed to cancel transfer.");
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
        onAdd={() => setOpenModal(true)}
        keyField="id"
      />

      <StockTransferForm
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        loading={saving}
        onSubmit={handleCreateTransfer}
      />

      <StockTransferDetailModal
        isOpen={openDetailModal}
        onClose={() => setOpenDetailModal(false)}
        data={selectedTransfer}
        onProcess={handleProcess}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </AppShell>
  );
  }