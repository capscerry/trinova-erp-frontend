"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout";
import Modal from "@/components/ui/Modal";

import {
  Warehouse,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "@/lib/services/warehouse.service";

import WarehouseTable from "@/components/modules/persediaan/warehouses/WarehouseTable";

import WarehouseForm, {
  WarehouseFormData,
} from "@/components/modules/persediaan/warehouses/WarehouseForm";

import DeleteWarehouseModal from "@/components/modules/persediaan/warehouses/DeleteWarehouseModal";

import { toast } from "sonner";

export default function WarehousePage() {
  const [warehouses, setWarehouses] =
    useState<Warehouse[]>([]);

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
    selectedWarehouse,
    setSelectedWarehouse,
  ] =
    useState<Warehouse | null>(
      null
    );

  async function fetchWarehouses() {
    try {
      setLoading(true);

      const data =
        await getWarehouses();

      setWarehouses(data);
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal mengambil data warehouse"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWarehouses();
  }, []);

  async function handleCreateWarehouse(
    data: WarehouseFormData
  ) {
    try {
      setSaving(true);

      await createWarehouse(data);

      await fetchWarehouses();

      setOpenModal(false);

      toast.success(
        "Warehouse berhasil ditambahkan"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menambahkan warehouse"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateWarehouse(
    data: WarehouseFormData
  ) {
    if (!selectedWarehouse)
      return;

    try {
      setSaving(true);

      await updateWarehouse({
        warehouse_id:
          selectedWarehouse.warehouse_id,

        warehouse_name:
          data.warehouse_name,

        warehouse_type:
          data.warehouse_type,

        warehouse_address:
          data.warehouse_address,

        description:
          data.description,
      });

      await fetchWarehouses();

      setOpenModal(false);

      setSelectedWarehouse(
        null
      );

      toast.success(
        "Warehouse berhasil diupdate"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal update warehouse"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWarehouse() {
    if (!selectedWarehouse)
      return;

    try {
      setDeleting(true);

      await deleteWarehouse(
        selectedWarehouse.warehouse_id
      );

      await fetchWarehouses();

      setOpenDeleteModal(
        false
      );

      setSelectedWarehouse(
        null
      );

      toast.success(
        "Warehouse berhasil dihapus"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Gagal menghapus warehouse"
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(
    warehouse: Warehouse
  ) {
    setIsEdit(true);

    setSelectedWarehouse(
      warehouse
    );

    setOpenModal(true);
  }

  function handleDeleteClick(
    warehouse: Warehouse
  ) {
    setSelectedWarehouse(
      warehouse
    );

    setOpenDeleteModal(true);
  }

  return (
    <AppShell
      title="Master Warehouse"
      subtitle="Kelola data warehouse"
    >
      <WarehouseTable
        warehouses={warehouses}
        loading={loading}
        onAdd={() => {
          setIsEdit(false);

          setSelectedWarehouse(
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

          setSelectedWarehouse(
            null
          );
        }}
        title={
          isEdit
            ? "Edit Warehouse"
            : "Tambah Warehouse"
        }
      >
        <WarehouseForm
          onSubmit={
            isEdit
              ? handleUpdateWarehouse
              : handleCreateWarehouse
          }
          loading={saving}
          initialData={
            selectedWarehouse
              ? {
                  warehouse_name:
                    selectedWarehouse.warehouse_name ??
                    "",
                  warehouse_type:
                    selectedWarehouse.warehouse_type ??
                    "",
                  warehouse_address:
                    selectedWarehouse.warehouse_address ??
                    "",
                  description:
                    selectedWarehouse.description ??
                    "",
                }
              : null
          }
        />
      </Modal>

      <DeleteWarehouseModal
        open={openDeleteModal}
        warehouse={
          selectedWarehouse
        }
        loading={deleting}
        onClose={() => {
          setOpenDeleteModal(
            false
          );

          setSelectedWarehouse(
            null
          );
        }}
        onConfirm={
          handleDeleteWarehouse
        }
      />
    </AppShell>
  );
}