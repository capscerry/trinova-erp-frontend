import { api } from "../api";

export const getSupplierProducts =
  async () => {

    const response =
      await api.get(
        "/supplier-product"
      );

    return response.data;
};

/**
 * Patch a supplier-product record.
 * Used to update available_stock after PO approval (deduct)
 * or after a purchase return is created (restore).
 *
 * @param id  - supplier_product_id (the PK of the supplier-product row)
 * @param payload - fields to update, e.g. { available_stock: 42 }
 */
export const updateSupplierProduct = async (
  id: number,
  payload: { available_stock?: number; [key: string]: any }
) => {
  const response = await api.patch(`/supplier-product/${id}`, payload);
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