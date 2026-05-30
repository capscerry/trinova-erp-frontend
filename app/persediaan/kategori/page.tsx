"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import Modal from "@/components/ui/Modal";

import {
  Category,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/services/category.service";

import CategoryTable from "@/components/modules/persediaan/categories/CategoryTable";

import CategoryForm, {
  CategoryFormData,
} from "@/components/modules/persediaan/categories/CategoryForm";

import DeleteCategoryModal from "@/components/modules/persediaan/categories/DeleteCategoryModal";

import { toast } from "sonner";

export default function CategoryPage() {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [openModal, setOpenModal] =
    useState(false);

  const [
    openDeleteModal,
    setOpenDeleteModal,
  ] = useState(false);

  const [isEdit, setIsEdit] =
    useState(false);

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<Category | null>(
      null
    );

  async function fetchCategories() {
    try {
      setLoading(true);

      const data =
        await getCategories();

      setCategories(data);
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data category"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleCreateCategory(
    data: CategoryFormData
  ) {
    try {
      setSaving(true);

      await createCategory(data);

      await fetchCategories();

      setOpenModal(false);

      toast.success(
        "Category berhasil ditambahkan"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menambahkan category"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCategory(
    data: CategoryFormData
  ) {
    if (!selectedCategory)
      return;

    try {
      setSaving(true);

      await updateCategory({
        category_id:
          selectedCategory.category_id,
        category_name:
          data.category_name,
      });

      await fetchCategories();

      setOpenModal(false);

      setSelectedCategory(
        null
      );

      toast.success(
        "Category berhasil diupdate"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal update category"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory() {
    if (!selectedCategory)
      return;

    try {
      setDeleting(true);

      await deleteCategory(
        selectedCategory.category_id
      );

      await fetchCategories();

      setOpenDeleteModal(
        false
      );

      setSelectedCategory(
        null
      );

      toast.success(
        "Category berhasil dihapus"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menghapus category"
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(
    category: Category
  ) {
    setIsEdit(true);

    setSelectedCategory(
      category
    );

    setOpenModal(true);
  }

  function handleDeleteClick(
    category: Category
  ) {
    setSelectedCategory(
      category
    );

    setOpenDeleteModal(true);
  }

  return (
    <AppShell
      title="Master Product Category"
      subtitle="Kelola data kategori produk"
    >
      <CategoryTable
        categories={categories}
        loading={loading}
        onAdd={() => {
          setIsEdit(false);

          setSelectedCategory(
            null
          );

          setOpenModal(true);
        }}
        onEdit={handleEdit}
        onDelete={
          handleDeleteClick
        }
      />

      <Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);

          setSelectedCategory(
            null
          );
        }}
        title={
          isEdit
            ? "Edit Category"
            : "Tambah Category"
        }
      >
        <CategoryForm
          onSubmit={
            isEdit
              ? handleUpdateCategory
              : handleCreateCategory
          }
          loading={saving}
          initialData={
            selectedCategory
          }
        />
      </Modal>

      <DeleteCategoryModal
        open={openDeleteModal}
        category={
          selectedCategory
        }
        loading={deleting}
        onClose={() => {
          setOpenDeleteModal(
            false
          );

          setSelectedCategory(
            null
          );
        }}
        onConfirm={
          handleDeleteCategory
        }
      />
    </AppShell>
  );
}