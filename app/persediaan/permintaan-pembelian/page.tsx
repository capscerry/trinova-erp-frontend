"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import PurchaseRequisitionModal from "@/components/modules/persediaan/purchase-requisition/PurchaseRequisitionModal";
import PurchaseRequisitionDetailModal from "@/components/modules/persediaan/purchase-requisition/PurchaseRequisitionDetailModal";

import {
  getPurchaseRequisitions,
  getPurchaseRequisitionDetail,
  type PurchaseRequisition,
} from "@/lib/services/purchase-requisition.service";

// ─── Types ──────────────────────────────────────────────────────────────

type PRStatus =
  | "REQUESTED"
  | "PROCESSED"
  | "CANCELLED";

// ─── Helpers ────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─── Status Badge ───────────────────────────────────────────────────────

const STATUS_STYLE: Record<
  PRStatus,
  string
> = {
  REQUESTED:
    "bg-amber-50 text-amber-700 border border-amber-200",

  PROCESSED:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  CANCELLED:
    "bg-rose-50 text-rose-600 border border-rose-200",
};

function PRStatusBadge({
  status,
}: {
  status: PRStatus;
}) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function PurchaseRequisitionPage() {
  const [data, setData] =
    useState<PurchaseRequisition[]>(
      []
    );

  const [loading, setLoading] =
    useState(false);

  const [openModal, setOpenModal] =
    useState(false);

  const [openDetail, setOpenDetail] =
    useState(false);

  const [selectedPR, setSelectedPR] =
    useState<any>(null);

  const fetchPurchaseRequisitions =
    async () => {
      try {
        setLoading(true);

        const result =
          await getPurchaseRequisitions();

        setData(result);
      } catch (error) {
        console.error(
          "Failed to fetch purchase requisitions",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  const handleView = async (
    row: PurchaseRequisition
  ) => {
    try {
      const detail =
        await getPurchaseRequisitionDetail(
          row.pr_id
        );

      setSelectedPR(detail);

      setOpenDetail(true);
    } catch (error) {
      console.error(
        "Failed to fetch PR detail",
        error
      );
    }
  };

  useEffect(() => {
    fetchPurchaseRequisitions();
  }, []);

  const columns: Column<PurchaseRequisition>[] =
    [
      {
        key: "pr_number",
        label: "PR Number",
        width: "180px",
        render: (val) => (
          <span className="font-mono font-semibold text-[12px] text-navy-700">
            {String(val)}
          </span>
        ),
      },

      {
        key: "pr_date",
        label: "Date",
        width: "120px",
        render: (val) => (
          <span className="text-slate-600 whitespace-nowrap">
            {formatDate(
              String(val)
            )}
          </span>
        ),
      },

      {
        key: "warehouse",
        label: "Warehouse",
        width: "220px",
        render: (_, row) => (
          <span className="font-medium text-slate-700">
            {row.warehouse
              ?.warehouse_name ??
              "-"}
          </span>
        ),
      },

      {
        key: "remarks",
        label: "Remarks",
        render: (val) => (
          <span className="text-slate-500 text-xs">
            {String(val || "-")}
          </span>
        ),
      },

      {
        key: "status",
        label: "Status",
        width: "180px",
        render: (val) => (
          <PRStatusBadge
            status={
              val as PRStatus
            }
          />
        ),
      },

      {
        key: "pr_id",
        label: "Action",
        width: "120px",
        render: (_, row) => (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              handleView(row)
            }
          >
            View
          </Button>
        ),
      },
    ];

  return (
    <AppShell
      title="Purchase Requisition"
      subtitle="Kelola permintaan pembelian"
    >
      <DataTable<PurchaseRequisition>
        title="Daftar Purchase Requisition"
        columns={columns}
        data={data}
        loading={loading}
        addLabel="Tambah Purchase Requisition"
        onAdd={() =>
          setOpenModal(true)
        }
        keyField="pr_id"
      />

      <PurchaseRequisitionModal
        isOpen={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        onSuccess={() => {
          fetchPurchaseRequisitions();
        }}
      />

      <PurchaseRequisitionDetailModal
        isOpen={openDetail}
        onClose={() =>
          setOpenDetail(false)
        }
        data={selectedPR}
      />
    </AppShell>
  );
}