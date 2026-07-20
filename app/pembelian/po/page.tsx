"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notify } from "@/lib/notify";
import { Download } from "lucide-react";
import * as XLSX from "xlsx-js-style";

import {
  getPurchaseOrders,
  getPurchaseOrderDetails,
  getPurchaseOrderDetailsByPO,

  createPurchaseOrder,
  createPurchaseOrderDetail,
  updatePurchaseOrderDetail,
  deletePurchaseOrderDetail,

  updatePurchaseOrder,
  approvePurchaseOrder,

  deletePurchaseOrder,

  getSuppliers,
  getSupplierProducts,
  getUoms,
} from "@/lib/services";

import { getNextPONumber } from "@/lib/services/po.service";
import {
  createPurchaseDownPayment,
  getPurchaseDownPayments,
} from "@/lib/services/purchase-down-payment.service";


import {
  createGoodsReceipt,
  createGoodsReceiptDetail,
  getGoodsReceipts,
} from "@/lib/services/gr.service";

import {
  createPurchaseInvoice,
  getPurchaseInvoices,
  updatePurchaseInvoice,
} from "@/lib/services/purchase-invoice.service";

import {
  createPurchasePayment,
} from "@/lib/services/purchase-payment.service";

import {
  purchaseRequisitionService,
  type PurchaseRequisition,
} from "@/lib/services/purchase-requisition.service";

import PurchaseOrderFormModal from "@/components/modules/pembelian/PurchaseOrderFormModal";

import PurchaseOrderDetailModal from "@/components/modules/pembelian/PurchaseOrderDetailModal";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type POStatus =
  | "Waiting to be processed"
  | "Processed"
  | "Partially processed"
  | "Cancelled"
  | "Draft"
  | "Approved"
  | "Pending Approval"
  | "Completed";

interface PurchaseOrder {
  id: string;
  nomor: string;
  tanggal: string;
  expected_date?: string | null;
  supplier: string;
  supplier_id: string;
  informasi: string;
  status: POStatus;
  total: number;
  items?: any[];
  transaction_name?: string;
  transaction_detail?: string;
  nomor_faktur_pajak?: string;
}

interface Supplier {
  id: string;
  nama: string;
  status?: string;
}

interface Product {
  id: string;

  nama: string;

  uom_id: number;

  supplier_id?: number;

  supplier_price?: number;

  available_stock?: number;

  lead_time_days?: number;
}

interface Uom {
  id: string;
  nama: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(n);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));

// ─────────────────────────────────────────────────────────────
// STATUS STYLE
// ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  "Waiting to be processed":
    "bg-amber-50 text-amber-700 border border-amber-200",

  Processed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  "Partially processed":
    "bg-blue-50 text-blue-700 border border-blue-200",

  Cancelled:
    "bg-rose-50 text-rose-600 border border-rose-200",

  Draft:
    "bg-slate-100 text-slate-700 border border-slate-200",

  Approved:
    "bg-indigo-50 text-indigo-700 border border-indigo-200",

  "Pending Approval":
    "bg-amber-50 text-amber-600 border border-amber-300",

  Completed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
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
// TABLE COLUMNS
// ─────────────────────────────────────────────────────────────

const COLUMNS: Column<PurchaseOrder>[] = [
  {
    key: "nomor",
    label: "Number #",
    width: "160px",

    render: (val) => (
      <span className="font-mono font-semibold text-[12px] text-navy-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "transaction_name",
    label: "Transaction Name",
    width: "180px",

    render: (val) => (
      <span className="text-slate-600 text-xs">
        {String(val || "—")}
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
    key: "status",
    label: "Status",
    width: "180px",

    render: (val) => (
      <POStatusBadge status={val as POStatus} />
    ),
  },

  {
    key: "total",
    label: "Total",
    width: "150px",

    render: (val) => (
      <span className="font-semibold text-slate-700 tabular-nums">
        Rp {formatRupiah(Number(val))}
      </span>
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function PurchaseOrderPage() {

  const router = useRouter();

  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  const [purchaseOrderDetails, setPurchaseOrderDetails] =
    useState<any[]>([]);

  const [downPayments, setDownPayments] =
    useState<any[]>([]);

  const [goodsReceipts, setGoodsReceipts] =
    useState<any[]>([]);

  const [purchaseInvoices, setPurchaseInvoices] =
    useState<any[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>([]);

  const [uoms, setUoms] =
    useState<Uom[]>([]);

  const [prList, setPrList] =
    useState<PurchaseRequisition[]>([]);

  const [openModal, setOpenModal] =
    useState(false);

  const [openDetail, setOpenDetail] =
    useState(false);

  const [selectedPO, setSelectedPO] =
    useState<any>(null);

  const [editingPO, setEditingPO] =
    useState<any>(null);

  // ── Confirm delete ──────────────────────────────────────────────────────────
  const [confirmDeletePO, setConfirmDeletePO] = useState<{ open: boolean; row: any }>({
    open: false, row: null,
  });
  const [deletePOLoading, setDeletePOLoading] = useState(false);

  // ─────────────────────────────────────────────────────────
  // FETCH PO
  // ─────────────────────────────────────────────────────────

  const fetchPurchaseOrders = async () => {

    try {

      const res = await getPurchaseOrders();

      const poList = Array.isArray(res)
        ? res
        : res.data;

      const mappedData = poList.map((item: any) => ({
        id: item.purchase_order_id.toString(),

        nomor: item.po_number,

        tanggal: item.order_date,

        supplier:
          item.supplier?.supplier_name || "-",

        supplier_id:
          item.supplier_id?.toString() ||
          item.supplier?.supplier_id?.toString() || "",

        informasi:
          item.status || "-",

        status:
          item.status as POStatus,

        total:
          item.total_amount,

        transaction_name:
          item.transaction_name ?? "",

        transaction_detail:
          item.transaction_detail ?? "",

        expected_date:
          item.expected_date ?? null,

        nomor_faktur_pajak:
          item.nomor_faktur_pajak ?? "",
      }));

      setPurchaseOrders(mappedData);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH DETAIL
  // ─────────────────────────────────────────────────────────

  const fetchPurchaseOrderDetails = async () => {

    try {

      const res =
        await getPurchaseOrderDetails();

      const detailList = Array.isArray(res)
        ? res
        : res.data;

      setPurchaseOrderDetails(detailList);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH DOWN PAYMENTS / GR / INVOICES
  // ─────────────────────────────────────────────────────────

  const fetchWorkflowData = async () => {
    try {
      const [dpRes, grRes, invRes] = await Promise.all([
        getPurchaseDownPayments(),
        getGoodsReceipts(),
        getPurchaseInvoices(),
      ]);

      const dps  = Array.isArray(dpRes)  ? dpRes  : dpRes.data  ?? [];
      const grs  = Array.isArray(grRes)  ? grRes  : grRes.data  ?? [];
      const invs = Array.isArray(invRes) ? invRes : invRes.data ?? [];

      setDownPayments(dps);
      setGoodsReceipts(grs);

      // Enrich invoices with purchase_order_id by joining through GR
      // The GR row has both goods_receipt_id and purchase_order_id.
      // The invoice row from the API has goods_receipt_id on the raw object
      // even if it wasn't in the mapped type — keep raw data here.
      const grMap: Record<number, number> = {};
      grs.forEach((gr: any) => {
        if (gr.goods_receipt_id != null && gr.purchase_order_id != null) {
          grMap[Number(gr.goods_receipt_id)] = Number(gr.purchase_order_id);
        }
      });

      const enriched = invs.map((inv: any) => ({
        ...inv,
        purchase_order_id:
          grMap[Number(inv.goods_receipt_id)] ??
          inv.purchase_order_id ??
          null,
      }));

      setPurchaseInvoices(enriched);
    } catch (error) {
      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH SUPPLIER
  // ─────────────────────────────────────────────────────────

  const fetchSuppliers = async () => {

    try {

      const res = await getSuppliers();

      const supplierList = Array.isArray(res)
        ? res
        : res.data;

      const mappedData = supplierList.map(
        (item: any) => ({
          id: item.supplier_id.toString(),
          nama: item.supplier_name,
          status: item.status ?? "Active",
        })
      );

      setSuppliers(mappedData);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH PRODUCT
  // ─────────────────────────────────────────────────────────

  const fetchProducts = async () => {

    try {

      const res =
        await getSupplierProducts();

      const productList =
        Array.isArray(res)
        ? res
        : res.data;

      const mappedData =
        productList.map(
          (item: any) => ({

            id:
              item.product_id.toString(),

            nama:
              item.product_name || "-",

            uom_id:
              item.uom_id || 0,

            supplier_id:
              item.supplier_id,

            supplier_price:
              item.supplier_price,

            available_stock:
              item.available_stock,

            lead_time_days:
              item.lead_time_days,
          })
        );

      setProducts(mappedData);

      setFilteredProducts(mappedData);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // FETCH UOM
  // ─────────────────────────────────────────────────────────

  const fetchUoms = async () => {

    try {

      const res = await getUoms();

      const uomList = Array.isArray(res)
        ? res
        : res.data;

      const mappedData = uomList.map(
        (item: any) => ({
          id: item.uom_id.toString(),
          nama: item.uom_name,
        })
      );

      setUoms(mappedData);

    } catch (error) {

      console.error(error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────

  const handleSubmitPO = async (
    payload: any
  ) => {

    try {

        // ── Client-side guard: catch obvious bad payloads before hitting the API ──
        if (!payload.supplier_id || Number(payload.supplier_id) === 0) {
          throw new Error("Supplier harus dipilih sebelum menyimpan PO.");
        }
        if (!payload.po_number) {
          throw new Error("Nomor PO belum tersedia. Tutup modal dan coba lagi.");
        }
        if (!payload.items?.length || payload.items.every((i: any) => !i.product_id)) {
          throw new Error("Tambahkan minimal satu produk ke PO.");
        }

        // ── Validate supplier is Active before hitting the API ─────────────────
        // Backend rejects with a generic "Insert Failed" if supplier is inactive.
        const supplierCheck = suppliers.find(
          (s) => s.id === String(payload.supplier_id)
        );
        if (!supplierCheck) {
          throw new Error("Supplier tidak ditemukan. Pilih supplier lain.");
        }
        if (supplierCheck.status && supplierCheck.status !== "Active") {
          throw new Error(
            `Supplier "${supplierCheck.nama}" tidak aktif (status: ${supplierCheck.status}). Hanya supplier berstatus Active yang dapat digunakan untuk PO.`
          );
        }

        // Always derive total_amount from the current line items so the header
        // stays in sync even if the form state carried a stale value from the DB.
        const computedTotal = (payload.items ?? []).reduce(
          (sum: number, item: any) => sum + Number(item.subtotal ?? 0),
          0
        );

        const buildHeaderPayload = (poNumber: string) => ({
          po_number:
            poNumber,

          supplier_id:
            Number(payload.supplier_id),

          order_date:
            (payload.order_date ?? "").split("T")[0],

          expected_date:
            payload.expected_date
              ? (payload.expected_date ?? "").split("T")[0]
              : null,

          status:
            payload.status,

          total_amount: computedTotal,

          transaction_name:
            payload.transaction_name || null,

          transaction_detail:
            payload.transaction_detail || null,

          nomor_faktur_pajak:
            payload.nomor_faktur_pajak || null,
        });

        const headerPayload = buildHeaderPayload(payload.po_number ?? "");

        // For updates, updatePayload is the same as headerPayload.
        const updatePayload = headerPayload;

        console.log(
          "HEADER PAYLOAD"
        );

        console.log(
          headerPayload
        );

        console.log(
          "DELETED ITEMS",
          payload.deletedItems
        );

        let purchaseOrderId = 0;

        if (editingPO?.purchase_order_id) {

          await updatePurchaseOrder(
            editingPO.purchase_order_id,
            updatePayload
          );

          purchaseOrderId =
            editingPO.purchase_order_id;

        } else {

          const headerResponse = await createPurchaseOrder(headerPayload);

          purchaseOrderId =
            headerResponse.purchase_order_id;
        }

        console.log(
          "DELETED ITEMS",
          payload.deletedItems
        );
        
        if (
          payload.deletedItems?.length
        ) {

          for (const detailId of payload.deletedItems) {

            await deletePurchaseOrderDetail(
              Number(detailId)
            );
          }
        }

        for (const item of payload.items) {

          const detailPayload = {

            purchase_order_id:
              purchaseOrderId,

            product_id:
              Number(item.product_id),

            quantity:
              Number(item.quantity),

            uom_id:
              Number(item.uom_id),

            price:
              Number(item.price),

            tax_percentage:
              Number(item.tax_percent ?? 0),

            tax_amount:
              Number(item.tax_amount ?? 0),

            subtotal:
              Number(item.subtotal),
          };

          if (
            item.purchase_order_detail_id
          ) {

            console.log(
            "UPDATE DETAIL",
            item
          );

          console.log(
            "DETAIL ID",
            item.purchase_order_detail_id
          );

            await updatePurchaseOrderDetail(

              Number(
                item.purchase_order_detail_id
              ),

              detailPayload
            );

          } else {

            await createPurchaseOrderDetail(
              detailPayload
            );
          }
        }

      await fetchPurchaseOrders();

      await fetchPurchaseOrderDetails();

      if (editingPO?.purchase_order_id) {
        // Edit: close the modal
        setOpenModal(false);
        setEditingPO(null);
        notify.success("Purchase Order berhasil diperbarui");
      } else {
        // Create: keep modal open so Proses Ke section becomes active
        setEditingPO(null);
        notify.success("Purchase Order berhasil dibuat");
        return { purchase_order_id: purchaseOrderId, po_number: payload.po_number };
      }

    } catch (error) {

      console.error(error);

      const errMsg = (error as any)?.message ?? "";
      if (errMsg.toLowerCase().includes("insert failed")) {
        notify.error(
          "Gagal membuat Purchase Order",
          "Supplier mungkin tidak aktif atau data tidak valid. Periksa kembali pilihan supplier."
        );
      } else {
        notify.error("Gagal membuat Purchase Order", errMsg || undefined);
      }
    }
  };

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  // Build the full PO header payload the API requires for PUT.
  // Normalises order_date to YYYY-MM-DD regardless of whether the
  // value came from an input (already trimmed) or the API (ISO datetime).
  const buildPOUpdatePayload = (formData: any, status: string) => ({
    po_number:          formData.po_number,
    supplier_id:        Number(formData.supplier_id),
    order_date:         (formData.order_date ?? "").split("T")[0],
    status,
    total_amount:       Number(formData.total_amount ?? 0),
    transaction_name:   formData.transaction_name ?? "",
    transaction_detail: formData.transaction_detail ?? "",
  });

  // ─────────────────────────────────────────────────────────
  // APPROVE PO
  // ─────────────────────────────────────────────────────────

  const handleApprovePO = async (poId: number, formData?: any) => {
    // Delegate approval + stock deduction entirely to the backend.
    // PATCH /api/purchase-order/{id}/approve atomically:
    //   1. Validates PO exists and is in Draft status
    //   2. Deducts available_stock for every detail line via DeductStock()
    //   3. Rolls back all deductions if any line fails, returning a clear error
    //   4. Transitions status Draft → Approved only when all lines succeed
    const result = await approvePurchaseOrder(poId);

    if (!result?.status) {
      throw new Error(result?.message ?? "Persetujuan gagal");
    }

    await fetchProducts();
    await fetchPurchaseOrders();
    notify.success("Purchase Order berhasil disetujui");
  };

  // ─────────────────────────────────────────────────────────
  // CREATE DOWN PAYMENT
  // ─────────────────────────────────────────────────────────

  const handleCreateDP = async (data: any) => {
    await createPurchaseDownPayment(data);
    await fetchWorkflowData();
    notify.success("Down payment berhasil dicatat");
  };

  // ─────────────────────────────────────────────────────────
  // CREATE GOODS RECEIPT
  // ─────────────────────────────────────────────────────────

  const handleCreateGR = async (
    poId: number,
    receiptData: any,
    lineItems: any[]
  ) => {
    const grResponse = await createGoodsReceipt(receiptData);
    const goodsReceiptId = grResponse.goods_receipt_id;

    for (const item of lineItems) {
      await createGoodsReceiptDetail({
        goods_receipt_id: goodsReceiptId,
        product_id: item.product_id,
        quantity: item.quantity,
      });
    }

    await fetchPurchaseOrderDetails();
    await fetchWorkflowData();
    notify.success("Goods Receipt berhasil dibuat");
    return grResponse;
  };

  // ─────────────────────────────────────────────────────────
  // CREATE INVOICE
  // ─────────────────────────────────────────────────────────

  const handleCreateInvoice = async (data: any, poId: number, formData: any) => {
    const result = await createPurchaseInvoice(data);
    await fetchWorkflowData();
    await fetchPurchaseOrders();
    console.log("CREATE INVOICE RESULT:", result);
    notify.success("Purchase Invoice berhasil dibuat");
    return result;
  };

  // ─────────────────────────────────────────────────────────
  // CREATE PAYMENT
  // ─────────────────────────────────────────────────────────

  const handleCreatePayment = async (data: any) => {
    // Strip the internal helper field before sending to API
    const { _outstanding_amount, ...apiPayload } = data;

    console.log("[handleCreatePayment] data:", data);
    console.log("[handleCreatePayment] outstanding:", _outstanding_amount, "amount:", data.amount);

    await createPurchasePayment(apiPayload);

    // Use the outstanding amount passed directly from the modal
    // (avoids stale-state lookup for newly-created invoices)
    const outstanding = Number(_outstanding_amount ?? 0);

    console.log("[handleCreatePayment] outstanding (num):", outstanding, "fully paid:", Number(data.amount) >= outstanding);

    if (outstanding > 0 && Number(data.amount) >= outstanding) {
      // Payment fully covers the outstanding — mark invoice as Paid
      try {
        await updatePurchaseInvoice(
          Number(data.purchase_invoice_id),
          { status: "Paid" }
        );
        console.log("[handleCreatePayment] invoice status updated to Paid");
      } catch (err) {
        console.error("[handleCreatePayment] updatePurchaseInvoice failed:", err);
        // Non-fatal: payment was recorded, status update failed
        // Still navigate so the user sees the updated list
      }

      notify.success("Invoice telah lunas — mengarahkan ke Purchase Invoice");

      // Close modal first, then navigate on next tick to avoid
      // React mid-render conflicts with router.push
      setOpenModal(false);
      setEditingPO(null);
      console.log("[handleCreatePayment] navigating to /pembelian/invoice");
      setTimeout(() => router.push("/pembelian/invoice"), 0);
      return;
    }

    await fetchWorkflowData();
    notify.success("Pembayaran berhasil dicatat");
  };

  // ─────────────────────────────────────────────────────────
  // NAVIGATE TO INVOICE PAGE
  // ─────────────────────────────────────────────────────────

  const handleNavigateToInvoicePage = () => {
    router.push("/pembelian/invoice");
  };

  // ─────────────────────────────────────────────────────────
  // QUICK NAV: DP / GR / INVOICE PAGE
  // ─────────────────────────────────────────────────────────

  const handleNavigateToDP = (poId: number, poNumber: string) => {
    router.push(`/pembelian/pdp?po_id=${poId}&po_number=${encodeURIComponent(poNumber)}`);
  };

  const handleNavigateToGR = (poId: number, poNumber: string) => {
    router.push(`/pembelian/gr?po_id=${poId}&po_number=${encodeURIComponent(poNumber)}`);
  };

  const handleNavigateToInvoice = (poId: number, poNumber: string) => {
    router.push(`/pembelian/invoice?po_id=${poId}&po_number=${encodeURIComponent(poNumber)}`);
  };

  // ─────────────────────────────────────────────────────────
  // FETCH PR LIST
  // ─────────────────────────────────────────────────────────

  const fetchPrList = async () => {
    try {
      const data = await purchaseRequisitionService.getAll();
      setPrList(data);
    } catch (error) {
      console.error("Failed to fetch PR list:", error);
    }
  };

  // ─────────────────────────────────────────────────────────
  // USE EFFECT
  // ─────────────────────────────────────────────────────────

  useEffect(() => {

    fetchPurchaseOrders();
    fetchPurchaseOrderDetails();
    fetchWorkflowData();
    fetchSuppliers();
    fetchProducts();
    fetchUoms();
    fetchPrList();

  }, []);

  // ─────────────────────────────────────────────────────────
  // EXPORT TO EXCEL (LIST)
  // ─────────────────────────────────────────────────────────

  const exportToExcel = () => {
    const today = new Date().toISOString().slice(0, 10);

    const NAVY  = { patternType: "solid", fgColor: { rgb: "1E3A5F" } };
    const LGRAY = { patternType: "solid", fgColor: { rgb: "F0F4F8" } };
    const WHITE = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
    const MED   = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "medium" }, right: { style: "medium" } };
    const THIN  = { top: { style: "thin"   }, bottom: { style: "thin"   }, left: { style: "thin"   }, right: { style: "thin"   } };

    const sTitle    = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, fill: NAVY, border: MED };
    const sSub      = { font: { sz: 10, color: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center" }, fill: LGRAY, border: MED };
    const sColHdr   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, fill: NAVY, border: MED };
    const sCell     = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "center", vertical: "center" }, fill: WHITE, border: THIN };
    const sCellLeft = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "left",   vertical: "center" }, fill: WHITE, border: THIN };
    const sNum      = { font: { sz: 10, color: { rgb: "374151" } }, alignment: { horizontal: "right",  vertical: "center" }, fill: WHITE, border: THIN, numFmt: '#,##0' };
    const sTotLbl   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED };
    const sTotVal   = { font: { bold: true, sz: 11, color: { rgb: "F5C518" } }, alignment: { horizontal: "right", vertical: "center" }, fill: NAVY, border: MED, numFmt: '#,##0' };

    const ws: XLSX.WorkSheet = {};
    const COLS = 6;
    const C = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

    // Row 0: title
    ws[C(0, 0)] = { v: "PURCHASE ORDER LIST", t: "s", s: sTitle };
    for (let c = 1; c < COLS; c++) ws[C(0, c)] = { v: "", t: "s", s: sTitle };

    // Row 1: export date
    ws[C(1, 0)] = { v: `Export Date: ${today}`, t: "s", s: sSub };
    for (let c = 1; c < COLS; c++) ws[C(1, c)] = { v: "", t: "s", s: sSub };

    // Row 2: blank
    for (let c = 0; c < COLS; c++) ws[C(2, c)] = { v: "", t: "s" };

    // Row 3: column headers
    const headers = ["NO.", "PO NUMBER", "DATE", "SUPPLIER", "STATUS", "TOTAL (Rp)"];
    headers.forEach((h, c) => { ws[C(3, c)] = { v: h, t: "s", s: sColHdr }; });

    // Data rows
    let grandTotal = 0;
    purchaseOrders.forEach((po, i) => {
      const r = 4 + i;
      ws[C(r, 0)] = { v: i + 1,       t: "n", s: sCell };
      ws[C(r, 1)] = { v: po.nomor,    t: "s", s: sCell };
      ws[C(r, 2)] = { v: formatDate(po.tanggal), t: "s", s: sCell };
      ws[C(r, 3)] = { v: po.supplier, t: "s", s: sCellLeft };
      ws[C(r, 4)] = { v: po.status,   t: "s", s: sCell };
      ws[C(r, 5)] = { v: po.total,    t: "n", s: sNum };
      grandTotal += po.total;
    });

    // Footer
    const footerR = 4 + purchaseOrders.length + 1;
    for (let c = 0; c < 4; c++) ws[C(footerR, c)] = { v: "", t: "s", s: { fill: NAVY, border: MED } };
    ws[C(footerR, 4)] = { v: "GRAND TOTAL", t: "s", s: sTotLbl };
    ws[C(footerR, 5)] = { v: grandTotal,    t: "n", s: sTotVal };

    ws["!ref"]    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: footerR, c: COLS - 1 } });
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    ];
    ws["!rows"]   = [{ hpt: 36 }, { hpt: 18 }, { hpt: 8 }, { hpt: 22 }];
    ws["!cols"]   = [{ wch: 5 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
    XLSX.writeFile(wb, `Purchase_Order_${today}.xlsx`);
  };

  // ── Execute PO delete (called after ConfirmDialog confirms) ────────────────
  const executeDeletePO = async () => {
    if (!confirmDeletePO.row) return;
    setDeletePOLoading(true);
    try {
      await deletePurchaseOrder(Number(confirmDeletePO.row.id));
      await fetchPurchaseOrders();
      notify.success("Purchase Order berhasil dihapus");
    } catch (error) {
      console.error(error);
      notify.error("Gagal menghapus Purchase Order");
    } finally {
      setDeletePOLoading(false);
      setConfirmDeletePO({ open: false, row: null });
    }
  };

  // ─────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────

  return (
    <AppShell
      title="Purchase Order"
      subtitle="Kelola pesanan pembelian"
    >

      <div className="flex justify-end gap-2 mb-3">
        <Button variant="secondary" size="sm" onClick={exportToExcel}>
          <Download size={14} className="mr-1.5" />
          Export Excel
        </Button>
      </div>

      <DataTable<PurchaseOrder>
        title="Daftar Order Fulfillment"
        columns={COLUMNS}
        data={purchaseOrders}
        keyField="id"
        dateField="tanggal"
        nameField="supplier"
        statusOptions={[
          "Waiting to be processed",
          "Processed",
          "Partially processed",
          "Cancelled",
          "Draft",
          "Pending Approval",
          "Approved",
          "Completed",
        ]}

        addLabel="Tambah Fulfillment"

        onAdd={() => {
          setEditingPO(null);
          setOpenModal(true);
        }}

        renderActions={(row) => (

          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                const poId = Number(row.id);

                let detailItems: any[] = [];
                try {
                  detailItems = await getPurchaseOrderDetailsByPO(poId);
                } catch (err) {
                  console.error("Failed to fetch PO details for detail view:", err);
                  detailItems = purchaseOrderDetails.filter(
                    (item: any) => Number(item.purchase_order_id) === poId
                  );
                }

                setSelectedPO({
                  po_number:
                    row.nomor,

                  supplier_name:
                    row.supplier,

                  order_date:
                    row.tanggal?.split("T")[0],

                  expected_date:
                    row.expected_date
                      ? String(row.expected_date).split("T")[0]
                      : null,

                  status:
                    row.status,

                  transaction_name:
                    row.transaction_name ?? "",

                  transaction_detail:
                    row.transaction_detail ?? "",

                  nomor_faktur_pajak:
                    row.nomor_faktur_pajak ?? "",

                  total_amount:
                    row.total,

                  items:
                    detailItems.map(
                      (item: any, idx: number) => {
                        console.log("[PO Detail] raw item:", JSON.stringify(item));
                        const product = products.find(
                          (p) => p.id === item.product_id?.toString()
                        );
                        return {
                          id:
                            item.purchase_order_detail_id != null
                              ? `${item.purchase_order_detail_id}-${idx}`
                              : crypto.randomUUID(),

                          product_id:
                            item.product_id?.toString(),

                          product_name:
                            product?.nama ||
                            `Product ${item.product_id}`,

                          isExisting: true,

                          quantity:
                            Number(item.quantity),

                          uom_id:
                            item.uom_id?.toString(),

                          uom_name:
                            item.uom?.uom_name ||
                            uoms.find(
                              (u) => u.id === item.uom_id?.toString()
                            )?.nama ||
                            "-",

                          price:
                            Number(item.price),

                          tax_percent:
                            Number(item.tax_percentage ?? item.tax_percent ?? 0),

                          tax_amount: (() => {
                            const taxPct = Number(item.tax_percentage ?? item.tax_percent ?? 0);
                            const base = Number(item.quantity) * Number(item.price);
                            return base * (taxPct / 100);
                          })(),

                          subtotal: (() => {
                            const taxPct = Number(item.tax_percentage ?? item.tax_percent ?? 0);
                            const base = Number(item.quantity) * Number(item.price);
                            return base + base * (taxPct / 100);
                          })(),

                          available_stock:
                            product?.available_stock,

                          lead_time_days:
                            product?.lead_time_days,
                        };
                      }
                    ),
                });

                setOpenDetail(true);
              }}
            >
              Detail
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const poId = Number(row.id);

                // Fetch details specifically for this PO so we always get the
                // right rows even when the bulk endpoint returns
                // purchase_order_id: null on each detail item.
                let detailItems: any[] = [];
                try {
                  detailItems = await getPurchaseOrderDetailsByPO(poId);
                } catch (err) {
                  console.error("Failed to fetch PO details:", err);
                  // Fall back to the already-loaded state (may be empty if
                  // purchase_order_id is null, but better than crashing).
                  detailItems = purchaseOrderDetails.filter(
                    (item: any) => Number(item.purchase_order_id) === poId
                  );
                }

                console.log("DETAIL ITEMS", detailItems);

                setEditingPO({
                  purchase_order_id: poId,

                  po_number:
                    row.nomor,

                  supplier_id:
                    row.supplier_id ||
                    suppliers.find(
                      (s) => s.nama === row.supplier
                    )?.id || "",

                  order_date:
                    row.tanggal?.split("T")[0],

                  expected_date:
                    row.expected_date
                      ? String(row.expected_date).split("T")[0]
                      : "",

                  status:
                    row.status,

                  transaction_name:
                    row.transaction_name ?? "",

                  transaction_detail:
                    row.transaction_detail ?? "",

                  nomor_faktur_pajak:
                    row.nomor_faktur_pajak ?? "",

                  items: detailItems.map((item: any) => {
                    // The API uses both "purchase_order_details_id" (plural) and
                    // "purchase_order_detail_id" (singular) depending on the route.
                    // Normalise to the singular form used everywhere in this file.
                    const detailId =
                      item.purchase_order_detail_id ??
                      item.purchase_order_details_id ??
                      null;

                    const taxPct = Number(
                      item.tax_percentage ?? item.tax_percent ?? 0
                    );
                    // Always recompute tax_amount and subtotal from the canonical
                    // formula so toggled-tax items are never stale.
                    const base = Number(item.quantity) * Number(item.price);
                    const taxAmount = base * (taxPct / 100);
                    const subtotal = base + taxAmount;

                    return {
                      id: crypto.randomUUID(),

                      purchase_order_detail_id: detailId,

                      product_id:
                        item.product_id?.toString(),

                      product_name:
                        products.find(
                          (p) => p.id === item.product_id?.toString()
                        )?.nama || "",

                      isExisting: true,

                      quantity: Number(item.quantity),

                      uom_id:
                        item.uom_id?.toString(),

                      uom_name:
                        item.uom?.uom_name ||
                        uoms.find(
                          (u) => u.id === item.uom_id?.toString()
                        )?.nama || "",

                      price: Number(item.price),

                      tax_percent: taxPct,

                      tax_amount: taxAmount,

                      subtotal: subtotal,
                    };
                  }),
                });

                setOpenModal(true);
              }}
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => {

                if (row.status === "Approved" || row.status === "Completed") {
                  toast.error("Tidak bisa menghapus PO", {
                    description: `Purchase Order dengan status "${row.status}" tidak dapat dihapus.`,
                  });
                  return;
                }

                setConfirmDeletePO({ open: true, row });
              }}
            >
              Hapus
            </Button>

          </div>

        )}
      />

      {/* CREATE / EDIT MODAL */}

      <PurchaseOrderFormModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingPO(null);
        }}
        initialData={editingPO}
        onSubmit={handleSubmitPO}
        onApprove={handleApprovePO}
        onCreateDP={handleCreateDP}
        onCreateGR={handleCreateGR}
        onCreateInvoice={handleCreateInvoice}
        onCreatePayment={handleCreatePayment}
        onNavigateToInvoicePage={handleNavigateToInvoicePage}
        onNavigateToDP={handleNavigateToDP}
        onNavigateToGR={handleNavigateToGR}
        onNavigateToInvoice={handleNavigateToInvoice}
        suppliers={suppliers}
        products={products}
        uoms={uoms}
        purchaseOrderDetails={purchaseOrderDetails}
        existingDownPayments={downPayments}
        existingGoodsReceipts={goodsReceipts}
        existingInvoices={purchaseInvoices}
        prList={prList}
      />

      {/* DETAIL MODAL */}

      <PurchaseOrderDetailModal
        open={openDetail}
        onClose={() =>
          setOpenDetail(false)
        }
        data={selectedPO}
      />

      {/* CONFIRM DELETE PO */}
      <ConfirmDialog
        open={confirmDeletePO.open}
        title="Hapus Purchase Order"
        message={`Yakin ingin menghapus Purchase Order ${confirmDeletePO.row?.nomor}?`}
        detail="Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        loading={deletePOLoading}
        onConfirm={executeDeletePO}
        onCancel={() => setConfirmDeletePO({ open: false, row: null })}
      />

    </AppShell>
  );
}