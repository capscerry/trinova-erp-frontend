"use client";

import React, { useState } from "react";

interface SupplierFormModalProps {
  open: boolean;

  isEdit: boolean;

  formData: {
    supplier_code: string;
    supplier_name: string;
    no_telp_bisnis: string;
    email: string;
    alamat: string;

    category_supplier: string;
  };

  setFormData: React.Dispatch<
    React.SetStateAction<{
      supplier_code: string;
      supplier_name: string;
      no_telp_bisnis: string;
      email: string;
      alamat: string;

      category_supplier: string;
    }>
  >;

  categories: {
    category_supplier: string;

    nama_category: string;
  }[];

  onClose: () => void;

  onSave: () => void;

  setCatalogFile: React.Dispatch<
    React.SetStateAction<File | null>
  >;
}

export default function SupplierFormModal({
  open,
  isEdit,
  formData,
  setFormData,

  categories,

  onClose,
  onSave,
  setCatalogFile,
}: SupplierFormModalProps) {

  const [selectedFileName, setSelectedFileName] =
    useState<string>("");

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0
        bg-black/40
        flex items-center
        justify-center
        z-50
      "
    >

      <div
        className="
          bg-white
          rounded-2xl
          w-full
          max-w-4xl
          shadow-2xl
          overflow-hidden
        "
      >

        {/* HEADER */}

        <div
          className="
            bg-gradient-to-r
            from-[#081F3F]
            to-[#0E2F5A]
            px-6 py-5
            flex items-start
            justify-between
          "
        >

          <div>

            <h2
              className="
                text-3xl
                font-bold
                text-white
              "
            >
              {
                isEdit
                  ? "Edit Supplier"
                  : "Tambah Supplier"
              }
            </h2>

            <p
              className="
                text-white/70
                text-sm
                mt-1
              "
            >
              Kelola data supplier dan supplier catalog
            </p>

          </div>

          <button
            onClick={onClose}
            className="
              text-white
              text-2xl
            "
          >
            ×
          </button>

        </div>

        {/* BODY */}

        <div className="p-6 space-y-8">

          {/* INFORMASI SUPPLIER */}

          <div>

            <h3
              className="
                text-sm
                font-bold
                tracking-[3px]
                text-slate-400
                uppercase
                mb-5
              "
            >
              Informasi Supplier
            </h3>

            <div className="grid grid-cols-2 gap-5">

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    mb-2
                    block
                  "
                >
                  Kode Supplier
                </label>

                <input
                  type="text"
                  placeholder="SUP-001"
                  value={formData.supplier_code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_code:
                        e.target.value,
                    })
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:ring-2
                    focus:ring-emerald-500
                  "
                />

              </div>

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    mb-2
                    block
                  "
                >
                  Nama Supplier
                </label>

                <input
                  type="text"
                  placeholder="PT Supplier Jaya"
                  value={formData.supplier_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supplier_name:
                        e.target.value,
                    })
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:ring-2
                    focus:ring-emerald-500
                  "
                />

              </div>

              {/* CATEGORY */}

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    mb-2
                    block
                  "
                >
                  Category Supplier
                </label>

                <select
                  value={
                    formData.category_supplier
                  }

                  onChange={(e) =>
                    setFormData({
                      ...formData,

                      category_supplier:
                        e.target.value,
                    })
                  }

                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:ring-2
                    focus:ring-emerald-500
                  "
                >

                  <option value="">
                    Pilih Category
                  </option>

                  {categories.map(
                    (item) => (

                      <option
                        key={
                          item.category_supplier
                        }

                        value={
                          item.category_supplier
                        }
                      >
                        {
                          item.nama_category
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    mb-2
                    block
                  "
                >
                  Telepon
                </label>

                <input
                  type="text"
                  placeholder="08123456789"
                  value={formData.no_telp_bisnis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      no_telp_bisnis:
                        e.target.value,
                    })
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:ring-2
                    focus:ring-emerald-500
                  "
                />

              </div>

              <div>

                <label
                  className="
                    text-sm
                    font-semibold
                    text-slate-500
                    mb-2
                    block
                  "
                >
                  Email
                </label>

                <input
                  type="email"
                  placeholder="supplier@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email:
                        e.target.value,
                    })
                  }
                  className="
                    w-full
                    border
                    border-slate-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:ring-2
                    focus:ring-emerald-500
                  "
                />

              </div>

            </div>

            <div className="mt-5">

              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-500
                  mb-2
                  block
                "
              >
                Alamat
              </label>

              <textarea
                placeholder="Alamat supplier"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alamat:
                      e.target.value,
                  })
                }
                className="
                  w-full
                  border
                  border-slate-300
                  rounded-2xl
                  px-4 py-4
                  h-28
                  resize-none
                  outline-none
                  focus:ring-2
                  focus:ring-emerald-500
                "
              />

            </div>

          </div>

          {/* UPLOAD CATALOG */}

          {!isEdit && (

            <div>

              <h3
                className="
                  text-xs
                  font-semibold
                  tracking-[0.25em]
                  text-slate-400
                  uppercase
                  mb-4
                "
              >
                Upload Supplier Catalog
              </h3>

              <div
                className="
                  border-2
                  border-dashed
                  border-slate-200
                  rounded-3xl
                  p-6
                  bg-slate-50
                "
              >

                <div className="flex items-center gap-3 flex-wrap">

                  <label
                    htmlFor="catalog-upload"
                    className="
                      inline-flex
                      items-center
                      gap-2
                      bg-emerald-600
                      hover:bg-emerald-700
                      text-white
                      px-4 py-2.5
                      rounded-xl
                      cursor-pointer
                      text-sm
                      font-medium
                      transition
                    "
                  >
                    📤 Upload Catalog
                  </label>

                  <input
                    id="catalog-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {

                      const file =
                        e.target.files?.[0];

                      if (!file) return;

                      setCatalogFile(file);

                      setSelectedFileName(
                        file.name
                      );
                    }}
                  />

                  {selectedFileName && (

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-2
                        bg-emerald-50
                        text-emerald-700
                        px-4 py-2.5
                        rounded-xl
                        text-sm
                        font-medium
                        border
                        border-emerald-200
                      "
                    >
                      ✅ {selectedFileName}
                    </div>

                  )}

                </div>

                <div className="mt-5 space-y-1 text-sm">

                  <p className="font-medium text-slate-600">
                    Format Excel
                  </p>

                  <p className="text-slate-500">
                    product_id, supplier_price,
                    available_, lead_time_days
                  </p>

                  <p className="text-xs text-slate-400">
                    Lead time days = estimasi hari pengiriman barang
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* FOOTER */}

        <div
          className="
            border-t
            px-6 py-5
            flex justify-end
            gap-3
          "
        >

          <button
            onClick={onClose}
            className="
              px-6 py-3
              border
              border-slate-300
              rounded-2xl
              font-medium
              hover:bg-slate-100
              transition
            "
          >
            Batal
          </button>

          <button
            onClick={onSave}
            className="
              px-6 py-3
              bg-[#081F3F]
              hover:bg-[#0E2F5A]
              text-white
              rounded-2xl
              font-semibold
              transition
              shadow-lg
            "
          >
            {
              isEdit
                ? "Update Supplier"
                : "Simpan Supplier"
            }
          </button>

        </div>

      </div>

    </div>
  );
}