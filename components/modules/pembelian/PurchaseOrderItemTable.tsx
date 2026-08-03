"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;

  product_id: string;
  product_name: string;

  isExisting?: boolean;

  quantity: number;

  uom_id: string;
  uom_name: string;

  price: number;

  /** Tax rate as a percentage, ex. 11 for 11% */
  tax_percent: number;

  /** Computed tax amount = (quantity * price) * (tax_percent / 100) */
  tax_amount: number;

  /** price times quantity plus tax_amount */
  subtotal: number;

  purchase_order_detail_id?: number;
}

interface Product {
  id: string;
  nama: string;

  supplier_price?: number;

  /** Raw available_stock from the API (= catalog stock already reduced by approved PO deductions). */
  available_stock?: number;

  /** Reconstructed original catalog stock = available_stock + reserved_quantity. */
  catalog_stock?: number;

  /** Sum of outstanding PO quantities for Approved/Partially-processed POs. */
  reserved_quantity?: number;

  lead_time_days?: number;

  uom_id?: number;
}

interface Uom {
  id: string;
  nama: string;
}

interface PurchaseOrderItemTableProps {
  items: PurchaseOrderItem[];

  products: Product[];

  uoms: Uom[];

  onUpdateItem: (
    id: string,
    patch: Partial<PurchaseOrderItem>
  ) => void;

  onRemoveItem: (
    id: string
  ) => void;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function PurchaseOrderItemTable({
  items,
  products,
  uoms,
  onUpdateItem,
  onRemoveItem,
}: PurchaseOrderItemTableProps) {

  return (

    <div className="border border-slate-200 rounded-xl overflow-hidden">

      <div className="overflow-x-auto">

        <table className="w-full border-collapse text-xs">

          <thead>

            <tr className="bg-slate-50 border-b border-slate-200">

              {[
                "Product",
                "Supplier Stock",
                "Reserved",
                "Available To Order",
                "Lead Time",
                "Qty",
                "UOM",
                "Price",
                "Tax %",
                "Tax Amount",
                "Subtotal",
                "",
              ].map((header) => (

                <th
                  key={header}
                  className="
                    px-3
                    py-2.5
                    text-left
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  {header}
                </th>

              ))}

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100">

            {items.map((item, idx) => (

              <tr
                key={item.id || idx}
                className="hover:bg-slate-50/50"
              >

                {/* PRODUCT */}

                <td className="px-3 py-2">

                  {item.isExisting ? (

                    <input
                      value={item.product_name}
                      disabled
                      className={cn(
                        inputCompact,
                        `
                          min-w-[220px]
                          bg-slate-50
                          text-slate-500
                          cursor-not-allowed
                        `
                      )}
                    />

                  ) : (

                    <select
                      value={item.product_id}
                      onChange={(e) => {

                        const selected =
                          products.find(
                            (product) =>
                              product.id ===
                              e.target.value
                          );

                        onUpdateItem(
                          item.id,
                          {
                            product_id:
                              e.target.value,

                            product_name:
                              selected?.nama || "",

                            price:
                              selected?.supplier_price || 0,

                            uom_id:
                              selected?.uom_id?.toString() || "",

                            uom_name:
                              uoms.find(
                                (u) =>
                                  u.id ===
                                  selected?.uom_id?.toString()
                              )?.nama || "",
                          }
                        );
                      }}
                      className={cn(
                        inputCompact,
                        "min-w-[220px]"
                      )}
                    >

                      <option value="">
                        Pilih Product
                      </option>

                      {products.map((product, productIdx) => (

                        <option
                          key={`${product.id}-${productIdx}`}
                          value={product.id}
                        >
                          {product.nama}
                        </option>

                      ))}

                    </select>

                  )}

                </td>

                {/* SUPPLIER STOCK / RESERVED / AVAILABLE TO ORDER */}

                <td className="px-3 py-2 text-right tabular-nums text-slate-700 font-medium">
                  {(() => {
                    const p = products.find((p) => p.id === item.product_id);
                    if (!p) return <span className="text-slate-400">-</span>;
                    const cs = p.catalog_stock ?? p.available_stock ?? 0;
                    return cs;
                  })()}
                </td>

                <td className="px-3 py-2 text-right tabular-nums text-amber-600 font-medium">
                  {(() => {
                    const p = products.find((p) => p.id === item.product_id);
                    if (!p) return <span className="text-slate-400">-</span>;
                    const rq = p.reserved_quantity ?? 0;
                    return rq > 0 ? rq : <span className="text-slate-400">0</span>;
                  })()}
                </td>

                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                  {(() => {
                    const p = products.find((p) => p.id === item.product_id);
                    if (!p) return <span className="text-slate-400">-</span>;
                    const ato = p.available_stock ?? 0;
                    return (
                      <span className={ato <= 0 ? "text-rose-600" : "text-emerald-600"}>
                        {ato}
                      </span>
                    );
                  })()}
                </td>

                {/* LEAD TIME */}

                <td className="px-3 py-2 text-slate-600">

                  {
                    products.find(
                      (p) =>
                        p.id === item.product_id
                    )?.lead_time_days
                      ? `${products.find(
                          (p) =>
                            p.id === item.product_id
                        )?.lead_time_days} Hari`
                      : "-"
                  }

                </td>

                {/* QTY */}

                <td className="px-3 py-2">

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {

                      const qty =
                        Number(
                          e.target.value
                        );

                      const stock =
                        products.find(
                          (p) =>
                            p.id === item.product_id
                        )?.available_stock;

                      if (
                        item.product_id &&
                        stock !== undefined &&
                        qty > stock
                      ) {

                        alert(
                          `Qty melebihi stok tersedia untuk dipesan (Available To Order: ${stock})`
                        );

                        return;
                      }

                      onUpdateItem(
                        item.id,
                        {
                          quantity: qty,
                        }
                      );
                    }}
                    className={cn(
                      inputCompact,
                      "w-20"
                    )}
                  />

                </td>

                {/* UOM */}

                <td className="px-3 py-2 font-medium text-slate-700">

                  {item.uom_name || "-"}

                </td>

                {/* PRICE */}

                <td className="px-3 py-2 font-medium whitespace-nowrap">

                  {formatRupiah(item.price)}

                </td>

                {/* TAX % */}

                <td className="px-3 py-2">

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={item.tax_percent ?? 0}
                      onChange={(e) => {
                        const tax = Math.min(100, Math.max(0, Number(e.target.value)));
                        onUpdateItem(item.id, { tax_percent: tax });
                      }}
                      className={cn(inputCompact, "w-16 text-right")}
                    />
                    <span className="text-slate-400 text-xs">%</span>
                  </div>

                </td>

                {/* TAX AMOUNT */}

                <td className="px-3 py-2 whitespace-nowrap text-slate-400 text-xs font-normal">
                  {item.tax_percent > 0
                    ? `+${formatRupiah(item.tax_amount)}`
                    : "-"}
                </td>

                {/* SUBTOTAL */}

                <td className="px-3 py-2 font-semibold whitespace-nowrap">
                  {formatRupiah(item.subtotal)}
                </td>

                {/* DELETE */}

                <td className="px-3 py-2">

                  <button
                    onClick={() =>
                      onRemoveItem(
                        item.id
                      )
                    }
                    disabled={
                      items.length === 1
                    }
                    className="
                      w-6
                      h-6
                      flex
                      items-center
                      justify-center
                      rounded-md
                      text-slate-300
                      hover:text-red-500
                      hover:bg-red-50
                      disabled:opacity-20
                      transition-colors
                    "
                  >
                    <Trash2 size={13} />
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLE
// ─────────────────────────────────────────────────────────────

const inputCompact = `
  px-2.5
  py-1.5
  text-xs
  rounded-lg
  border
  border-slate-200
  bg-white
  text-slate-700
  focus:outline-none
`;