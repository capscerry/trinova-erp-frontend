"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";
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
    key: "supplier",
    label: "Supplier",
    width: "200px",

    render: (val) => (
      <span className="font-medium text-slate-700">
        {String(val)}
      </span>
    ),
  },

  {
    key: "informasi",
    label: "Information",

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

  const [purchaseOrders, setPurchaseOrders] =
    useState<PurchaseOrder[]>([]);

  const [purchaseOrderDetails, setPurchaseOrderDetails] =
    useState<any[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>([]);

  const [uoms, setUoms] =
    useState<Uom[]>([]);

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
            payload.order_date,

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

            subtotal:
              Number(item.subtotal),
          };

          if (
            item.purchase_order_detail_id
          ) {

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

      setOpenModal(false);

      setEditingPO(null);

      toast.success(
        editingPO
          ? "Purchase Order berhasil diperbarui"
          : "Purchase Order berhasil dibuat"
      );

    } catch (error) {

      console.error(error);

      toast.error(
        "Gagal membuat Purchase Order"
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // USE EFFECT
  // ─────────────────────────────────────────────────────────

  useEffect(() => {

    fetchPurchaseOrders();
    fetchPurchaseOrderDetails();
    fetchSuppliers();
    fetchProducts();
    fetchUoms();

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
                      (item: any) => ({
                        id:
                          item.purchase_order_detail_id?.toString(),

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

      {/* CREATE MODAL */}

      <PurchaseOrderFormModal
        open={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        initialData={editingPO}
        onSubmit={handleSubmitPO}
        suppliers={suppliers}
        products={products}
        uoms={uoms}
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