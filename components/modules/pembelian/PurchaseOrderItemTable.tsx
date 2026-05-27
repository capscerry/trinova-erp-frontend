"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;

  product_id: string;
  product_name: string;

  quantity: number;

  uom_id: string;
  uom_name: string;

  price: number;

  subtotal: number;
}

interface Product {
  id: string;
  nama: string;
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
                "Qty",
                "UOM",
                "Price",
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

            {items.map((item) => (

              <tr
                key={item.id}
                className="hover:bg-slate-50/50"
              >

                {/* PRODUCT */}

                <td className="px-3 py-2">

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
                            selected?.nama ||
                            "",
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

                    {products.map((product) => (

                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.nama}
                      </option>

                    ))}

                  </select>

                </td>

                {/* QTY */}

                <td className="px-3 py-2">

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateItem(
                        item.id,
                        {
                          quantity:
                            Number(
                              e.target.value
                            ),
                        }
                      )
                    }
                    className={cn(
                      inputCompact,
                      "w-20"
                    )}
                  />

                </td>

                {/* UOM */}

                <td className="px-3 py-2">

                  <select
                    value={item.uom_id}
                    onChange={(e) => {

                      const selected =
                        uoms.find(
                          (uom) =>
                            uom.id ===
                            e.target.value
                        );

                      onUpdateItem(
                        item.id,
                        {
                          uom_id:
                            e.target.value,

                          uom_name:
                            selected?.nama ||
                            "",
                        }
                      );
                    }}
                    className={cn(
                      inputCompact,
                      "min-w-[140px]"
                    )}
                  >

                    <option value="">
                      Pilih UOM
                    </option>

                    {uoms.map((uom) => (

                      <option
                        key={uom.id}
                        value={uom.id}
                      >
                        {uom.nama}
                      </option>

                    ))}

                  </select>

                </td>

                {/* PRICE */}

                <td className="px-3 py-2">

                  <input
                    type="number"
                    min={0}
                    value={item.price}
                    onChange={(e) =>
                      onUpdateItem(
                        item.id,
                        {
                          price:
                            Number(
                              e.target.value
                            ),
                        }
                      )
                    }
                    className={cn(
                      inputCompact,
                      "w-32"
                    )}
                  />

                </td>

                {/* SUBTOTAL */}

                <td className="px-3 py-2 font-semibold whitespace-nowrap">

                  {formatRupiah(
                    item.subtotal
                  )}

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