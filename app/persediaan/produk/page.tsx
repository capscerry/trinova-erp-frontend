"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout";

import Modal from "@/components/ui/Modal";

import ProductFormModal, {
  ProductFormData,
} from "@/components/modules/persediaan/products/ProductFormModal";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/services/product.service";

import { toast } from "sonner";

import { Product } from "./types";

import ProductTable from "@/components/modules/persediaan/products/ProductTable";

import DeleteProductModal from "@/components/modules/persediaan/products/DeleteProductModal";

import EmptyProductState from "@/components/modules/persediaan/products/EmptyProductState";

export default function MasterProductPage() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);
  
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  const [openModal, setOpenModal] =
    useState(false);

  const [
    openDeleteModal,
    setOpenDeleteModal,
  ] = useState(false);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<Product | null>(
    null
  );

  useEffect(() => {
    fetchProducts();
  }, []);

  // ─── Fetch Products ─────────────────────────────────────────────────────────
  async function fetchProducts() {
    try {
      setLoading(true);

      const data =
        await getProducts();

      setProducts(data);

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data produk"
      );

    } finally {
      setLoading(false);
    }
  }

  // ─── Create Product ─────────────────────────────────────────────────────────
  async function handleCreateProduct(
    data: ProductFormData
  ) {
    try {
      setSaving(true);

      await createProduct(data);

      toast.success(
        "Produk berhasil ditambahkan"
      );

      setOpenModal(false);

      fetchProducts();

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menambahkan produk"
      );

    } finally {
      setSaving(false);
    }
  }

  // ─── Update Product ─────────────────────────────────────────────────────────
  async function handleUpdateProduct(
    data: ProductFormData
  ) {
    if (!editingProduct) return;

    try {
      setSaving(true);

      await updateProduct({
        ...data,
        product_id:
          editingProduct.product_id,
      });

      toast.success(
        "Produk berhasil diperbarui"
      );

      setOpenModal(false);

      setEditingProduct(null);

      fetchProducts();

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal memperbarui produk"
      );

    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Product ─────────────────────────────────────────────────────────
  async function handleDeleteProduct() {
    if (!selectedProduct) return;

    try {
      setDeleting(true);

      await deleteProduct(
        selectedProduct.product_id
      );

      setProducts((prev) =>
        prev.filter(
          (item) =>
            item.product_id !==
            selectedProduct.product_id
        )
      );

      toast.success(
        "Produk berhasil dihapus"
      );

      setOpenDeleteModal(false);

      setSelectedProduct(null);

    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menghapus produk"
      );

    } finally {
      setDeleting(false);
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleDeleteClick(
    product: Product
  ) {
    setSelectedProduct(product);

    setOpenDeleteModal(true);
  }

  function handleEdit(
    product: Product
  ) {
    setEditingProduct(product);

    setOpenModal(true);
  }

  return (
    <AppShell
      title="Master Product"
      subtitle="Kelola data produk"
    >
      {/* ─── Empty State ───────────────────────────────────────────── */}
      {!loading &&
      products.length === 0 ? (
        <EmptyProductState
          onAdd={() =>
            setOpenModal(true)
          }
        />
      ) : (
        <ProductTable
          products={products}
          loading={loading}
          onAdd={() =>
            setOpenModal(true)
          }
          onEdit={handleEdit}
          onDelete={
            handleDeleteClick
          }
        />
      )}

      {/* ─── Create Modal ─────────────────────────────────────────── */}
      <ProductFormModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingProduct(null);
        }}
        onSubmit={
          editingProduct
            ? handleUpdateProduct
            : handleCreateProduct
        }
        loading={saving}
        initialData={editingProduct}
      />

      {/* ─── Delete Modal ─────────────────────────────────────────── */}
      <DeleteProductModal
        open={openDeleteModal}
        product={selectedProduct}
        loading={deleting}
        onClose={() =>
          setOpenDeleteModal(
            false
          )
        }
        onConfirm={
          handleDeleteProduct
        }
      />
    </AppShell>
  );
}