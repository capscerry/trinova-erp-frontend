"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";

import PurchasePaymentFormModal from "@/components/modules/pembelian/PurchasePaymentFormModal";

import {
  getPurchasePayments,
  createPurchasePayment,
  updatePurchasePayment,
  deletePurchasePayment,
} from "@/lib/services/purchase-payment.service";

import {
  getPurchaseInvoices,
  updatePurchaseInvoice,
} from "@/lib/services";

// ─────────────────────────────────────────────
// COLUMNS
// ─────────────────────────────────────────────

const COLUMNS: Column<any>[] = [
  {
    key: "payment_number",
    label: "Payment Number",
    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },
  {
    key: "invoice_number",
    label: "Invoice Number",
  },
  {
    key: "supplier_name",
    label: "Supplier",
  },
  {
    key: "amount",
    label: "Amount",
    render: (val) => (
      <span className="font-semibold text-slate-700">
        Rp {Number(val).toLocaleString("id-ID")}
      </span>
    ),
  },
  {
    key: "payment_method",
    label: "Method",
  },
  {
    key: "status",
    label: "Status",
    render: (val) => (
      <span
        className="
          inline-flex px-2.5 py-1
          rounded-full text-xs font-semibold
          bg-emerald-50 text-emerald-700
          border border-emerald-200
        "
      >
        {String(val)}
      </span>
    ),
  },
];

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function PurchasePaymentPage() {

  const router = useRouter();

  const [payments, setPayments] =
    useState<any[]>([]);

  const [purchaseInvoices, setPurchaseInvoices] =
    useState<any[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [editingPayment, setEditingPayment] =
    useState<any | null>(null);

  const [openDetail, setOpenDetail] =
    useState(false);

  const [detailData, setDetailData] =
    useState<any | null>(null);

  // ─── Load ───────────────────────────────────

  const loadData = async () => {
    try {
      const res = await getPurchasePayments();
      setPayments(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await getPurchaseInvoices();
      setPurchaseInvoices(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    fetchInvoices();
  }, []);

  const availableInvoices =
    purchaseInvoices.filter(
      (inv) => Number(inv.outstanding_amount) > 0
    );

  // ─── Add ────────────────────────────────────

  const handleAdd = () => {
    setIsEdit(false);
    setEditingPayment(null);
    setOpenModal(true);
  };

  // ─── Edit ───────────────────────────────────

  const handleEdit = (row: any) => {
    setIsEdit(true);
    setEditingPayment(row);
    setOpenModal(true);
  };

  // ─── Delete ─────────────────────────────────

  const handleDelete = async (row: any) => {
    const confirmed = confirm(
      `Yakin ingin menghapus payment ${row.payment_number}?`
    );
    if (!confirmed) return;

    try {
      await deletePurchasePayment(row.purchase_payment_id);
      toast.success("Purchase Payment berhasil dihapus");
      await loadData();
      await fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus Purchase Payment");
    }
  };

  // ─── Detail ─────────────────────────────────

  const handleDetail = (row: any) => {
    setDetailData(row);
    setOpenDetail(true);
  };

  // ─── Submit (Create / Edit) ──────────────────

  const handleSubmit = async (data: any) => {
    try {

      if (isEdit && editingPayment) {

        // ── UPDATE ──
        const payload = {
          payment_date:   data.payment_date,
          amount:         data.amount,
          payment_method: data.payment_method,
          notes:          data.notes,
          status:         data.status,
        };

        await updatePurchasePayment(
          editingPayment.purchase_payment_id,
          payload
        );

        setOpenModal(false);
        setEditingPayment(null);
        toast.success("Purchase Payment berhasil diperbarui");
        await loadData();
        await fetchInvoices();

      } else {

        // ── CREATE ──
        const payload = {
          purchase_invoice_id: data.purchase_invoice_id,
          payment_date:        data.payment_date,
          amount:              data.amount,
          payment_method:      data.payment_method,
          notes:               data.notes,
          status:              "Paid",
        };

        await createPurchasePayment(payload);

        // If payment fully covers the outstanding amount,
        // mark the invoice as Paid and redirect.
        const paidInvoice = purchaseInvoices.find(
          (inv) =>
            inv.purchase_invoice_id === data.purchase_invoice_id
        );

        if (
          paidInvoice &&
          data.amount >= Number(paidInvoice.outstanding_amount)
        ) {
          await updatePurchaseInvoice(
            paidInvoice.purchase_invoice_id,
            { status: "Paid" }
          );

          setOpenModal(false);
          router.push("/pembelian/invoice");
          return;
        }

        setOpenModal(false);
        toast.success("Purchase Payment berhasil dibuat");
        await loadData();
        await fetchInvoices();
      }

    } catch (error) {
      console.error(error);
      toast.error(
        isEdit
          ? "Gagal memperbarui Purchase Payment"
          : "Gagal membuat Purchase Payment"
      );
    }
  };

  // ─── Render ─────────────────────────────────

  return (
    <AppShell
      title="Purchase Payment"
      subtitle="Kelola pembayaran supplier"
    >

      <DataTable<any>
        title="Daftar Purchase Payment"
        columns={COLUMNS}
        data={payments}
        keyField="purchase_payment_id"
        nameField="supplier_name"
        statusOptions={["Paid", "Unpaid", "Cancelled"]}
        addLabel="Tambah Payment"
        onAdd={handleAdd}
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDetail(row)}
            >
              Detail
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(row)}
            >
              Hapus
            </Button>

          </div>
        )}
      />

      {/* ─── Form Modal (Create / Edit) ──── */}

      <PurchasePaymentFormModal
        open={openModal}
        isEdit={isEdit}
        initialData={editingPayment ?? undefined}
        onClose={() => {
          setOpenModal(false);
          setEditingPayment(null);
        }}
        purchaseInvoices={
          isEdit ? purchaseInvoices : availableInvoices
        }
        onSubmit={handleSubmit}
      />

      {/* ─── Detail Modal ───────────────────── */}

      {openDetail && detailData && (

        <div
          className="
            fixed inset-0
            bg-black/50 backdrop-blur-[2px]
            flex items-center justify-center
            z-50
          "
        >
          <div
            className="
              bg-white rounded-2xl
              w-full max-w-lg
              shadow-2xl border border-slate-200
              overflow-hidden
            "
          >

            {/* Header */}
            <div
              className="
                flex items-center justify-between
                px-6 py-4
                bg-gradient-to-r from-navy-900 to-navy-600
              "
            >
              <div>
                <h2 className="text-white font-semibold text-[15px]">
                  Detail Purchase Payment
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Informasi lengkap pembayaran
                </p>
              </div>

              <button
                onClick={() => setOpenDetail(false)}
                className="
                  w-8 h-8 rounded-lg
                  flex items-center justify-center
                  text-slate-400
                  hover:text-white hover:bg-white/10
                  transition-colors
                "
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">

              {[
                { label: "Payment Number", value: detailData.payment_number },
                { label: "Invoice Number", value: detailData.invoice_number },
                { label: "Supplier",       value: detailData.supplier_name },
                {
                  label: "Amount",
                  value: `Rp ${Number(detailData.amount).toLocaleString("id-ID")}`,
                },
                { label: "Payment Date",   value: detailData.payment_date },
                { label: "Payment Method", value: detailData.payment_method },
                { label: "Status",         value: detailData.status },
                { label: "Notes",          value: detailData.notes || "—" },
              ].map(({ label, value }) => (

                <div
                  key={label}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {value || "—"}
                  </p>
                </div>

              ))}

            </div>

            {/* Footer */}
            <div
              className="
                border-t border-slate-100
                px-6 py-4
                flex justify-end
                bg-slate-50/60
              "
            >
              <Button
                variant="ghost"
                onClick={() => setOpenDetail(false)}
              >
                Tutup
              </Button>
            </div>

          </div>
        </div>
      )}

    </AppShell>
  );
}
