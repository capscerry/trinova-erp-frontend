"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export interface WarehouseFormData {
  warehouse_name: string;
  warehouse_type: string;
  warehouse_address: string;
  description: string;
}

interface Props {
  onSubmit: (
    data: WarehouseFormData
  ) => Promise<void>;

  loading?: boolean;

  initialData?: WarehouseFormData | null;
}

export default function WarehouseForm({
  onSubmit,
  loading = false,
  initialData = null,
}: Props) {
  const [formData, setFormData] =
    useState<WarehouseFormData>({
      warehouse_name: "",
      warehouse_type: "",
      warehouse_address: "",
      description: "",
    });

  const isEdit =
    initialData !== null;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    await onSubmit(formData);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium">
          Warehouse Name <span className="text-red-500 font-bold">*</span>
        </label>

        <input
          name="warehouse_name"
          value={formData.warehouse_name}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Warehouse Type <span className="text-red-500 font-bold">*</span>
        </label>

        <input
          name="warehouse_type"
          value={formData.warehouse_type}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Address <span className="text-red-500 font-bold">*</span>
        </label>

        <textarea
          name="warehouse_address"
          value={
            formData.warehouse_address
          }
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Description
        </label>

        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="w-full rounded-lg border px-3 py-2"
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : isEdit
            ? "Update"
            : "Save"}
        </Button>
      </div>
    </form>
  );
}