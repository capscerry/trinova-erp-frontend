import { api } from "../api";

// reserved_quantity / available_to_order are now computed server-side (from
// open PO qty minus GR received qty) and returned directly on every
// supplier-product row -- no client-side reconstruction needed anymore.

export const getSupplierProducts =
  async () => {

    const response =
      await api.get(
        "/supplier-product"
      );

    return response.data;
};

export const getSupplierProductsBySupplier =
  async (supplierId: number) => {

    const response =
      await api.get(
        `/supplier-product/by-supplier/${supplierId}`
      );

    return response.data;
};

/**
 * Patch a supplier-product record -- used from the Supplier Detail view to
 * fix a duplicate/incorrect catalog row (price, stock, lead time, availability).
 *
 * @param id  - supplier_product_id (the PK of the supplier-product row)
 * @param payload - fields to update, e.g. { available_stock: 42 }
 */
export const updateSupplierProduct = async (
  id: number,
  payload: { available_stock?: number; [key: string]: any }
) => {
  const response = await api.put(`/supplier-product/${id}`, payload);
  return response.data;
};

/**
 * Remove a single catalog row -- used from the Supplier Detail view to
 * clean up a stray/duplicate entry left over from a bad Excel upload.
 */
export const deleteSupplierProduct = async (id: number) => {
  const response = await api.delete(`/supplier-product/${id}`);
  return response.data;
};

/**
 * Restore stock for a returned item.
 * Calls POST /api/supplier-product/restore-stock on the backend which
 * does an atomic available_stock += quantity — no race condition.
 */
export const restoreStock = async (
  productId: number,
  supplierId: number,
  quantity: number
) => {
  const response = await api.post("/supplier-product/restore-stock", {
    product_id: productId,
    supplier_id: supplierId,
    quantity,
  });
  return response.data;
};

export const importSupplierCatalog =
  async (
    supplierId: number,
    file: File
  ) => {

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await api.post(

        `/supplier-product/import/${supplierId}`,

        formData,

        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

    return response.data;
};