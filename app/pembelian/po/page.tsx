"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  getPurchaseOrders,
  getPurchaseOrderDetails,

  createPurchaseOrder,
  createPurchaseOrderDetail,
  updatePurchaseOrderDetail,
  deletePurchaseOrderDetail,

  updatePurchaseOrder,

  deletePurchaseOrder,

  getSuppliers,
  getSupplierProducts,
  getUoms,
} from "@/lib/services";

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
  | "Completed";

interface PurchaseOrder {
  id: string;
  nomor: string;
  tanggal: string;
  supplier: string;
  supplier_id: string;
  informasi: string;
  status: POStatus;
  total: number;
  items?: any[];
}

interface Supplier {
  id: string;
  nama: string;
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

        const headerPayload = {

          po_number:
            payload.po_number,

          supplier_id:
            Number(
              payload.supplier_id
            ),

          order_date:
            (payload.order_date ?? "").split("T")[0],

          expected_date:
            payload.expected_date
              ? (payload.expected_date ?? "").split("T")[0]
              : null,

          status:
            payload.status,

          total_amount:
            payload.total_amount,
        };

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
            headerPayload
          );

          purchaseOrderId =
            editingPO.purchase_order_id;

        } else {

          const headerResponse =
            await createPurchaseOrder(
              headerPayload
            );

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

            tax_percent:
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
        toast.success("Purchase Order berhasil diperbarui");
      } else {
        // Create: keep modal open so Proses Ke section becomes active
        setEditingPO(null);
        toast.success("Purchase Order berhasil dibuat");
        return { purchase_order_id: purchaseOrderId, po_number: payload.po_number };
      }

    } catch (error) {

      console.error(error);

      toast.error(
        "Gagal membuat Purchase Order"
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────

  // Build the full PO header payload the API requires for PUT.
  // Normalises order_date to YYYY-MM-DD regardless of whether the
  // value came from an input (already trimmed) or the API (ISO datetime).
  const buildPOUpdatePayload = (formData: any, status: string) => ({
    po_number:    formData.po_number,
    supplier_id:  Number(formData.supplier_id),
    order_date:   (formData.order_date ?? "").split("T")[0],
    status,
    total_amount: Number(formData.total_amount ?? 0),
  });

  // ─────────────────────────────────────────────────────────
  // APPROVE PO
  // ─────────────────────────────────────────────────────────

  const handleApprovePO = async (poId: number, formData?: any) => {
    // Prefer the live form data passed from the modal (covers newly-created POs
    // that aren't in the purchaseOrders list yet). Fall back to the table row.
    let data: any;

    if (formData) {
      data = formData;
    } else {
      const po = purchaseOrders.find(p => Number(p.id) === poId);
      const supplier = suppliers.find(s => s.nama === po?.supplier);
      data = {
        po_number:    po?.nomor ?? "",
        supplier_id:  supplier?.id ?? "0",
        order_date:   po?.tanggal ?? "",
        total_amount: po?.total ?? 0,
      };
    }

    await updatePurchaseOrder(poId, buildPOUpdatePayload(data, "Approved"));
    await fetchPurchaseOrders();
    toast.success("Purchase Order berhasil disetujui");
  };

  // ─────────────────────────────────────────────────────────
  // CREATE DOWN PAYMENT
  // ─────────────────────────────────────────────────────────

  const handleCreateDP = async (data: any) => {
    await createPurchaseDownPayment(data);
    await fetchWorkflowData();
    toast.success("Down payment berhasil dicatat");
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
    toast.success("Goods Receipt berhasil dibuat");
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
    toast.success("Purchase Invoice berhasil dibuat");
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

      toast.success("Invoice telah lunas — mengarahkan ke Purchase Invoice");

      // Close modal first, then navigate on next tick to avoid
      // React mid-render conflicts with router.push
      setOpenModal(false);
      setEditingPO(null);
      console.log("[handleCreatePayment] navigating to /pembelian/invoice");
      setTimeout(() => router.push("/pembelian/invoice"), 0);
      return;
    }

    await fetchWorkflowData();
    toast.success("Pembayaran berhasil dicatat");
  };

  // ─────────────────────────────────────────────────────────
  // NAVIGATE TO INVOICE PAGE
  // ─────────────────────────────────────────────────────────

  const handleNavigateToInvoicePage = () => {
    router.push("/pembelian/invoice");
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
  // RETURN
  // ─────────────────────────────────────────────────────────

  return (
    <AppShell
      title="Purchase Order"
      subtitle="Kelola pesanan pembelian"
    >

      <DataTable<PurchaseOrder>
        title="Daftar Purchase Order"
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
          "Approved",
          "Completed",
        ]}

        addLabel="Tambah PO"

        onAdd={() => {
          setEditingPO(null);
          setOpenModal(true);
        }}

        renderActions={(row) => (

          <div className="flex gap-1.5 justify-center">

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {

                const detailItems =
                  purchaseOrderDetails.filter(
                    (item: any) =>
                      Number(item.purchase_order_id) ===
                      Number(row.id)
                  );

                setSelectedPO({
                  po_number:
                    row.nomor,

                  supplier_name:
                    row.supplier,

                  order_date:
                    row.tanggal?.split("T")[0],

                  status:
                    row.status,

                  items:
                    detailItems.map(
                      (item: any, idx: number) => ({
                        id:
                          item.purchase_order_detail_id != null
                            ? `${item.purchase_order_detail_id}-${idx}`
                            : crypto.randomUUID(),

                          product_id:
                            item.product_id?.toString(),

                          product_name:
                            products.find(
                              (p) =>
                                p.id ===
                                item.product_id?.toString()
                            )?.nama ||
                            `Product ${item.product_id}`,

                          isExisting: true,

                        quantity:
                          item.quantity,

                        uom_id:
                          item.uom_id?.toString(),

                        uom_name:
                          item.uom?.uom_name ||
                          "-",

                        price:
                          item.price,

                        subtotal:
                          item.subtotal,
                      })
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
              onClick={() => {

              const detailItems =
                purchaseOrderDetails.filter(
                  (item: any) =>
                    Number(item.purchase_order_id) ===
                    Number(row.id)
                );

              console.log(
                "DETAIL ITEMS",
                detailItems
              );

                setEditingPO({

                  purchase_order_id:
                    Number(row.id),

                  po_number:
                    row.nomor,
                  supplier_id:
                    row.supplier_id ||
                    suppliers.find(
                      (s) =>
                        s.nama === row.supplier
                    )?.id || "",

                  order_date:
                    row.tanggal?.split("T")[0],

                  status:
                    row.status,

                  items:
                    detailItems.map(
                      (item: any) => ({
                        
                        id: crypto.randomUUID(),

                          purchase_order_detail_id:
                            item.purchase_order_detail_id,

                        product_id:
                          item.product_id?.toString(),

                        product_name:
                          products.find(
                            (p) =>
                              p.id ===
                              item.product_id?.toString()
                          )?.nama || "",

                        isExisting: true,

                        quantity:
                          item.quantity,

                        uom_id:
                          item.uom_id?.toString(),

                        uom_name:
                          uoms.find(
                            (u) =>
                              u.id ===
                              item.uom_id?.toString()
                          )?.nama || "",

                        price:
                          item.price,

                        subtotal:
                          item.subtotal,
                      })
                    ),
                });

                setOpenModal(true);
              }}
            >
              Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={async () => {

                const confirmed =
                  confirm(
                    `Hapus Purchase Order ${row.nomor}?`
                  );

                if (!confirmed) return;

                try {

                  await deletePurchaseOrder(
                    Number(row.id)
                  );

                  await fetchPurchaseOrders();

                  toast.success(
                    "Purchase Order berhasil dihapus"
                  );

                } catch (error) {

                  console.error(error);

                  toast.error(
                    "Gagal menghapus Purchase Order"
                  );
                }
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

    </AppShell>
  );
}