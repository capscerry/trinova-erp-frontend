"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout";

import {
  DataTable,
  type Column,
} from "@/components/ui/DataTable";

import PurchasePaymentFormModal
  from "@/components/modules/pembelian/PurchasePaymentFormModal";

import {
  getPurchasePayments,
  createPurchasePayment,
} from "@/lib/services/purchase-payment.service";

import {
  getPurchaseInvoices,
  updatePurchaseInvoice,
} from "@/lib/services";

// ─────────────────────────────────────────────
// COLUMN
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
    key: "status",
    label: "Status",

    render: (val) => (
      <span
        className="
          inline-flex
          px-2.5
          py-1
          rounded-full
          text-xs
          font-semibold
          bg-emerald-50
          text-emerald-700
          border
          border-emerald-200
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

  const loadData = async () => {

    try {

      const res =
        await getPurchasePayments();

      setPayments(
        res.data || []
      );

    } catch (err) {

      console.error(err);

    }
  };

  const fetchInvoices = async () => {

    try {

      const res =
        await getPurchaseInvoices();

      setPurchaseInvoices(
        res.data || []
      );

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
      (invoice) =>
        Number(
          invoice.outstanding_amount
        ) > 0
    );

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
        onAdd={() =>
          setOpenModal(true)
        }
      />

      <PurchasePaymentFormModal
        open={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        purchaseInvoices={
          availableInvoices
        }
        onSubmit={async (data) => {

          try {

            const payload = {
              purchase_invoice_id:
                data.purchase_invoice_id,

              payment_date:
                data.payment_date,

              amount:
                data.amount,

              payment_method:
                data.payment_method,

              notes:
                data.notes,

              status:
                "Paid",
            };

            await createPurchasePayment(
              payload
            );

            // Find the invoice that was just paid
            const paidInvoice =
              purchaseInvoices.find(
                (inv) =>
                  inv.purchase_invoice_id ===
                  data.purchase_invoice_id
              );

            // If payment fully covers the outstanding amount,
            // update the invoice status to Paid and redirect
            if (
              paidInvoice &&
              data.amount >=
                Number(paidInvoice.outstanding_amount)
            ) {

              await updatePurchaseInvoice(
                paidInvoice.purchase_invoice_id,
                { status: "Paid" }
              );

              setOpenModal(false);

              router.push(
                "/pembelian/invoice"
              );

              return;
            }

            await loadData();
            await fetchInvoices();

            setOpenModal(false);

            alert(
              "Purchase Payment berhasil dibuat"
            );

          } catch (error) {

            console.error(error);

            alert(
              "Gagal membuat Purchase Payment"
            );
          }
        }}
      />

    </AppShell>
  );
}