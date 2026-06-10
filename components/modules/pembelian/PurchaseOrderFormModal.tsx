"use client";

import { useState, useEffect } from "react";

import {
  X,
  Hash,
  Calendar,
  Building2,
  Plus,
  ToggleLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";

import PurchaseOrderItemTable, {
  PurchaseOrderItem,
} from "./PurchaseOrderItemTable";

interface Supplier {
  id: string;
  nama: string;
}

interface Product {
  id: string;

  nama: string;

  supplier_id?: number;

  supplier_price?: number;

  available_stock?: number;

  lead_time_days?: number;

  uom_id?: number;
}

interface Uom {
  id: string;
  nama: string;
}

export interface PurchaseOrderFormData {
  po_number: string;
  supplier_id: string;
  order_date: string;
  status: string;

  total_amount: number;

  items: PurchaseOrderItem[];

  deletedItems?: number[];
}

interface PurchaseOrderFormModalProps {
  open: boolean;
  onClose: () => void;

  onSubmit: (
    data: PurchaseOrderFormData
  ) => void;

  suppliers: Supplier[];
  products: Product[];
  uoms: Uom[];

  initialData?: PurchaseOrderFormData | null;
}

const todayStr = () =>
  new Date()
    .toISOString()
    .split("T")[0];

const generatePONumber = () =>
  `PO-${new Date().getFullYear()}-${Math.floor(
    Math.random() * 9000
  ) + 1000}`;

const formatRupiah = (
  n: number
) =>
  new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }
  ).format(n);

const newItem = (): PurchaseOrderItem => ({
  id: crypto.randomUUID(),

  product_id: "",
  product_name: "",

  quantity: 1,

  uom_id: "",
  uom_name: "",

  price: 0,

  subtotal: 0,
});

export default function PurchaseOrderFormModal({
  open,
  onClose,
  onSubmit,
  suppliers,
  products,
  uoms,
  initialData,
}: PurchaseOrderFormModalProps) {

  const isEdit = !!initialData;

  const isSaved = isEdit;

  const [openDPModal, setOpenDPModal] =
  useState(false);

  const [form, setForm] =
    useState<PurchaseOrderFormData>({
      po_number: generatePONumber(),

      supplier_id: "",

      order_date: todayStr(),

      status: "Draft",

      total_amount: 0,

      items: [newItem()],
    });

    useEffect(() => {

      if (!open) return;

      if (initialData) {

        console.log("INITIAL DATA");
        console.log(initialData);

        setForm(initialData);

        const filtered =
          products.filter(
            (product) =>
              product.supplier_id?.toString() ===
              initialData.supplier_id
          );

        setFilteredProducts(filtered);

      } else {

        setForm({
          po_number: generatePONumber(),
          supplier_id: "",
          order_date: todayStr(),
          status: "Draft",
          total_amount: 0,
          items: [newItem()],
        });

        setFilteredProducts([]);
      }

    }, [open, initialData, products]);

  const setField = <
    K extends keyof PurchaseOrderFormData
  >(
    key: K,
    value: PurchaseOrderFormData[K]
  ) => {

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const [
    filteredProducts,
    setFilteredProducts
  ] = useState<Product[]>([]);

  const [
    deletedItems,
    setDeletedItems
  ] = useState<number[]>([]);

  const handleSupplierChange = (
    supplierId: string
  ) => {

    const filtered =
      products.filter(
        (item: any) =>
          item.supplier_id?.toString()
          === supplierId
      );

    setFilteredProducts(filtered);

    setField(
      "supplier_id",
      supplierId
    );
  };

  const updateItem = (
    id: string,
    patch: Partial<PurchaseOrderItem>
  ) => {

    setForm((prev) => ({

      ...prev,

      items: prev.items.map((item) => {

        if (item.id !== id) {
          return item;
        }

        const updated = {
          ...item,
          ...patch,
        };

        return {
          ...updated,

          subtotal:
            updated.quantity *
            updated.price,
        };
      }),
    }));
  };

const removeItem = (
  id: string
) => {

  const item =
    form.items.find(
      (x) => x.id === id
    );

  if (
    item?.purchase_order_detail_id
  ) {


    console.log(
      "DELETE DETAIL ID",
      item.purchase_order_detail_id
    );
        setDeletedItems(
          (prev) => [
            ...prev,
            Number(
              item.purchase_order_detail_id
            )
          ]
        );
      }

      setForm((prev) => ({

        ...prev,

        items: prev.items.filter(
          (item) =>
            item.id !== id
        ),
      }));
    };

  const addItem = () => {

    setForm((prev) => ({

      ...prev,

      items: [
        ...prev.items,
        newItem(),
      ],
    }));
  };

  const grandTotal =
    form.items.reduce(
      (acc, item) =>
        acc + item.subtotal,
      0
    );

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

        <div
          className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-full
            max-w-4xl
            max-h-[92vh]
            flex
            flex-col
            border
            border-slate-200
            overflow-hidden
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              px-6
              py-4
              bg-gradient-to-r
              from-navy-900
              to-navy-600
              shrink-0
            "
          >

            <div>

              <h2 className="text-white font-semibold text-[15px]">
                {isEdit
                  ? "Edit Purchase Order"
                  : "Tambah Purchase Order"}
              </h2>

              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit
                  ? "Perbarui data purchase order"
                  : "Buat pesanan pembelian baru"}
              </p>

            </div>

            <button
              onClick={onClose}
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                text-slate-400
                hover:text-white
                hover:bg-white/10
                transition-colors
              "
            >
              <X size={16} />
            </button>

          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            <Section title="Informasi Purchase Order">

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  label="PO Number"
                  icon={<Hash size={13} />}
                >

                  <input
                    readOnly
                    value={form.po_number}
                    className={cn(
                      inputBase,
                      "bg-slate-50 text-slate-500"
                    )}
                  />

                </FormField>

                <FormField
                  label="Tanggal"
                  icon={<Calendar size={13} />}
                >

                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) =>
                      setField(
                        "order_date",
                        e.target.value
                      )
                    }
                    className={inputBase}
                  />

                </FormField>

              </div>

              <FormField
                label="Supplier"
                icon={<Building2 size={13} />}
              >
                {isEdit ? (

                  <input
                    value={
                      suppliers.find(
                        (s) => s.id === form.supplier_id
                      )?.nama || ""
                    }
                    disabled
                    className={cn(
                      inputBase,
                      `
                        bg-slate-50
                        text-slate-500
                        cursor-not-allowed
                      `
                    )}
                  />

                ) : (

                  <SelectField
                    value={
                      suppliers.find(
                        (s) => s.id === form.supplier_id
                      )?.nama || ""
                    }
                    placeholder="Pilih supplier..."
                    options={suppliers.map(
                      (supplier) => supplier.nama
                    )}
                    onChange={(value) => {
                      const selected =
                        suppliers.find(
                          (supplier) =>
                            supplier.nama === value
                        );

                      const supplierId =
                        selected?.id || "";

                      setField(
                        "supplier_id",
                        supplierId
                      );

                      const filtered =
                        products.filter(
                          (item: any) =>
                            item.supplier_id?.toString() ===
                            supplierId
                        );

                      setFilteredProducts(filtered);
                    }}
                  />

                )}
              </FormField>

              <FormField
                label="Status"
                icon={<ToggleLeft size={13} />}
              >

                <div className="flex gap-2">

                  {[
                    "Draft",
                    "Approved",
                    "Completed",
                  ].map((status) => (

                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setField(
                          "status",
                          status
                        )
                      }
                      className={cn(
                        `
                          px-3
                          py-1.5
                          rounded-lg
                          text-xs
                          font-semibold
                          border
                          transition-all
                        `,
                        form.status === status
                          ? `
                            bg-navy-900
                            text-gold-400
                            border-navy-900
                          `
                          : `
                            bg-white
                            border-slate-200
                            text-slate-400
                          `
                      )}
                    >
                      {status}
                    </button>

                  ))}

                </div>

              </FormField>

            </Section>

            <Section
              title="Detail Item"
              action={

                <button
                  onClick={addItem}
                  className="
                    inline-flex
                    items-center
                    gap-1
                    px-3
                    py-1.5
                    rounded-lg
                    text-xs
                    font-semibold
                    bg-navy-900
                    text-gold-400
                  "
                >
                  <Plus size={12} />
                  Tambah Baris
                </button>

              }
            >

              <PurchaseOrderItemTable
                items={form.items}
                products={filteredProducts}
                uoms={uoms}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                />

              <div className="flex justify-end mt-3">

                <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[220px]">

                  <div className="flex items-center justify-between gap-8">

                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                      Total
                    </span>

                    <span className="text-base font-bold text-gold-400">
                      {formatRupiah(
                        grandTotal
                      )}
                    </span>

                  </div>

                </div>

              </div>

            </Section>

            {isSaved && (

              <Section title="Proses Ke">

                <p className="text-xs text-slate-400 mb-2">
                  Lanjutkan proses dari Purchase Order ini ke dokumen berikut.
                </p>

                <div className="grid grid-cols-3 gap-3">

                  <button
                    className="
                      flex flex-col items-start gap-2
                      p-3.5
                      rounded-xl
                      border
                      border-violet-200
                      bg-violet-50
                    "
                  >
                    <p className="text-xs font-bold">
                      Uang Muka
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Buat pembayaran uang muka supplier
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      setOpenDPModal(true)
                    }
                    className="
                      flex flex-col items-start gap-2
                      p-3.5
                      rounded-xl
                      border
                      border-violet-200
                      bg-violet-50
                    "
                  >
                    <p className="text-xs font-bold">
                      Goods Receipt
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Terima barang dari supplier
                    </p>
                  </button>

                  <button
                    className="
                      flex flex-col items-start gap-2
                      p-3.5
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                    "
                  >
                    <p className="text-xs font-bold">
                      Purchase Invoice
                    </p>

                    <p className="text-[10px] text-slate-400">
                      Buat tagihan supplier
                    </p>
                  </button>

                </div>

              </Section>

            )}

          </div>

          <div
            className="
              flex
              items-center
              justify-end
              gap-2
              px-6
              py-4
              border-t
              border-slate-100
              bg-slate-50/60
              shrink-0
            "
          >

            <button
              onClick={onClose}
              className="
                px-4
                py-2
                text-sm
                font-semibold
                text-slate-600
                bg-white
                border
                border-slate-200
                rounded-lg
              "
            >
              Batal
            </button>

            <button
              onClick={() => {

                onSubmit({
                  ...form,
                  total_amount: grandTotal,
                   deletedItems,
                });

                onClose();
              }}
              className="
                px-5
                py-2
                text-sm
                font-semibold
                text-gold-400
                bg-navy-900
                rounded-lg
              "
            >
              {isEdit
                ? "Simpan Perubahan"
                : "Buat Purchase Order"}
            </button>

          </div>

        </div>

      </div>
    
    {openDPModal && (

  <div className="fixed inset-0 z-[60] flex items-center justify-center">

    <div
      className="absolute inset-0 bg-black/40"
      onClick={() =>
        setOpenDPModal(false)
      }
    />

    <div className="relative bg-white rounded-2xl p-6 w-full max-w-md">

      <h2 className="font-bold text-lg">
        Uang Muka Pembelian
      </h2>

      <div className="mt-4 space-y-3">

        <div>

          <label className="text-sm">
            No PO
          </label>

          <input
            value={form.po_number}
            readOnly
            className={inputBase}
          />

        </div>

        <div>

          <label className="text-sm">
            Total PO
          </label>

          <input
            value={formatRupiah(
              grandTotal
            )}
            readOnly
            className={inputBase}
          />

        </div>

      </div>

      <div className="flex justify-end mt-4">

        <button
          onClick={() =>
            setOpenDPModal(false)
          }
          className="
            px-4 py-2
            rounded-lg
            bg-navy-900
            text-gold-400
          "
        >
          Tutup
        </button>

      </div>

    </div>

  </div>

)}
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {

  return (

    <div>

      <div className="flex items-center justify-between mb-3">

        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {title}
        </h3>

        {action}

      </div>

      <div className="space-y-3">
        {children}
      </div>

    </div>
  );
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {

  return (

    <div className="space-y-1.5">

      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">

        {icon && (
          <span className="text-slate-400">
            {icon}
          </span>
        )}

        {label}

      </label>

      {children}

    </div>
  );
}

function SelectField({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onChange: (
    value: string
  ) => void;
}) {

  const [open, setOpen] =
    useState(false);

  return (

    <div className="relative">

      <button
        type="button"
        onClick={() =>
          setOpen((prev) => !prev)
        }
        className={cn(
          `
            w-full
            flex
            items-center
            justify-between
            gap-2
            border
            border-slate-200
            bg-white
            text-left
            transition-all
            focus:outline-none
            focus:ring-2
            focus:ring-navy-600/20
            focus:border-navy-500
            px-3
            py-2.5
            rounded-lg
            text-sm
          `,
          value
            ? "text-slate-700"
            : "text-slate-400"
        )}
      >

        <span className="truncate">
          {value || placeholder}
        </span>

        <span
          className={cn(
            `
              text-slate-400
              transition-transform
              text-xs
            `,
            open && "rotate-180"
          )}
        >
          ▼
        </span>

      </button>

      {open && (

        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() =>
              setOpen(false)
            }
          />

          <div
            className="
              absolute
              top-full
              mt-1
              left-0
              z-20
              bg-white
              border
              border-slate-200
              rounded-xl
              shadow-lg
              py-1
              min-w-full
              max-h-48
              overflow-y-auto
            "
          >

            {options.map((option) => (

              <button
                key={option}
                type="button"
                onClick={() => {

                  onChange(option);

                  setOpen(false);
                }}
                className={cn(
                  `
                    w-full
                    text-left
                    px-4
                    py-2
                    text-xs
                    transition-colors
                  `,
                  option === value
                    ? `
                      bg-navy-900
                      text-gold-400
                      font-semibold
                    `
                    : `
                      text-slate-600
                      hover:bg-slate-50
                    `
                )}
              >
                {option}
              </button>

            ))}

          </div>

        </>
      )}

    </div>
  );
}
const inputBase = `
  w-full
  px-3
  py-2.5
  text-sm
  rounded-lg
  border
  border-slate-200
  bg-white
  text-slate-700
  placeholder-slate-400
  focus:outline-none
`;