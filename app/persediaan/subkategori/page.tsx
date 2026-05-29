"use client";

import {
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout";

import { Button } from "@/components/ui/Button";

import Modal from "@/components/ui/Modal";

import SubcategoryTable from "@/components/modules/persediaan/subcategories/SubcategoryTable";

import SubcategoryForm, {
  SubcategoryFormData,
} from "@/components/modules/persediaan/subcategories/SubcategoryForm";

import DeleteSubcategoryModal from "@/components/modules/persediaan/subcategories/SubcategoryDeleteModal";

import {
  createSubcategory,
  deleteSubcategory,
  getSubcategories,
  ProductSubcategory,
  updateSubcategory,
} from "@/lib/services/subcategory.service";

import { toast } from "sonner";

export default function SubcategoryPage() {
  const [subcategories, setSubcategories] =
    useState<
      ProductSubcategory[]
    >([]);

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
    selectedSubcategory,
    setSelectedSubcategory,
  ] =
    useState<ProductSubcategory | null>(
      null
    );

  async function fetchSubcategories() {
    try {
      setLoading(true);

      const data =
        await getSubcategories();

      setSubcategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubcategories();
  }, []);

  async function handleCreateSubcategory(
    data: SubcategoryFormData
  ) {
    try {
      setSaving(true);

      await createSubcategory(data);

      await fetchSubcategories();

      setOpenModal(false);

      toast.success(
        "Subcategory berhasil ditambahkan"
      );
    } catch (error: any) {
      console.error(error);

      const message =
        error?.response?.data
          ?.message;

      if (
        message?.includes(
          "already exist"
        )
      ) {
      toast.error(
        "Subcategory sudah terdaftar"
      );
      } else {
        toast.error(
          "Gagal menambahkan subcategory"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateSubcategory(
    data: SubcategoryFormData
  ) {
    if (!selectedSubcategory)
      return;

    try {
      setSaving(true);

      await updateSubcategory(
        selectedSubcategory.subcategory_id,
        data
      );

      await fetchSubcategories();

      setOpenModal(false);

      setSelectedSubcategory(
        null
      );

      toast.success(
        "Subcategory berhasil diupdate"
      );
    } catch (error: any) {
      console.error(error);

      const message =
        error?.response?.data
          ?.message;

      if (
        message?.includes(
          "already exist"
        )
      ) {
        toast.error(
          "Subcategory sudah terdaftar"
        );
      } else {
        toast.error(
          "Gagal update subcategory"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSubcategory() {
    if (!selectedSubcategory)
      return;

    try {
      setDeleting(true);

      await deleteSubcategory(
        selectedSubcategory.subcategory_id
      );

      await fetchSubcategories();

      setOpenDeleteModal(
        false
      );

      setSelectedSubcategory(
        null
      );

      toast.success(
        "Subcategory berhasil dihapus"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menghapus subcategory"
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(
    subcategory: ProductSubcategory
  ) {
    setIsEdit(true);

    setSelectedSubcategory(
      subcategory
    );

    setOpenModal(true);
  }

  function handleDeleteClick(
    subcategory: ProductSubcategory
  ) {
    setSelectedSubcategory(
      subcategory
    );

    setOpenDeleteModal(true);
  }

  return (
    <AppShell

      title="Master Product Subcategory"
      subtitle="Kelola data subcategory produk"
    >
      <SubcategoryTable
        subcategories={subcategories}
        loading={loading}
        onAdd={() => {
          setIsEdit(false);

          setSelectedSubcategory(
            null
          );

          setOpenModal(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Modal Create/Edit */}
      <Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);

          setSelectedSubcategory(
            null
          );
        }}
        title={
          isEdit
            ? "Edit Subcategory"
            : "Tambah Subcategory"
        }
      >
        <SubcategoryForm
          onSubmit={
            isEdit
              ? handleUpdateSubcategory
              : handleCreateSubcategory
          }
          loading={saving}
          initialData={
            selectedSubcategory
          }
        />
      </Modal>

      {/* Delete Modal */}
      <DeleteSubcategoryModal
        open={
          openDeleteModal
        }
        subcategory={
          selectedSubcategory
        }
        loading={deleting}
        onClose={() => {
          setOpenDeleteModal(
            false
          );

          setSelectedSubcategory(
            null
          );
        }}
        onConfirm={
          handleDeleteSubcategory
        }
      />
    </AppShell>
  );
}