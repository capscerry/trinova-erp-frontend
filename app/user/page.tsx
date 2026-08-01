"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useEffect, useState } from "react";

import {MasterUser,MasterRole,masterUserService,roleService} from "@/lib/services/user.service";

import { UserFormData, UserFormModal } from "@/components/modules/MasterUserModal";
import { cn } from "@/lib/utils";

const COLUMNS: Column<MasterUser>[] = [
  {
    key: "username",
    label: "Username",
    width: "150px",
  },
  {
    key: "email",
    label: "Email",
    width: "220px",
  },
  {
    key: "role",
    label: "Role",
    width: "220px",
  },
  {
    key: "status",
    label: "Status",
    width: "120px",
    render: (value) => (
      <span
        className={`px-2 py-1 rounded-md text-xs font-medium ${
          value
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {value ? "Aktif" : "Nonaktif"}
      </span>
    ),
  },
];

export default function MasterUserPage() {
  const [users, setUsers]     = useState<MasterUser[]>([]);
  const [roles, setRoles]     = useState<MasterRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm]   = useState(false);
  const [isEdit, setIsEdit]       = useState(false);
  const [selectedId, setSelectedId] = useState(0);
  const [formInit, setFormInit]   = useState<Partial<UserFormData>>({});

  const [confirmStatus, setConfirmStatus] = useState<{
    open: boolean;
    id: number;
    username: string;
    currentStatus: boolean;
  } | null>(null);
  
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchUser = async () => {
    setLoading(true);
    try {
      const result = await masterUserService.getAll();
      setUsers(result);
    } catch (err) {
      console.error("Gagal mengambil data user", err);
      showToast("Gagal mengambil data user", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleForModal = async () => {
    try {
      const result = await roleService.getAll();
      setRoles(result);
    } catch (err) {
      console.error("Gagal mengambil data role", err);
      showToast("Gagal mengambil data role", "error");
    }
  };

  useEffect(() => {
    fetchUser();
    fetchRoleForModal();
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  // CREATE
  const handleSubmit = async (data: UserFormData) => {
    try {
      if (isEdit) {
        const success = await masterUserService.update({
          id: selectedId,
          email: data.email,
          roleId: Number(data.roleId),
        });

        if (success) {
          showToast("User berhasil diperbarui", "success");
        } else {
          showToast("User gagal diperbarui", "error");
        }
      } else {
        const success = await masterUserService.create({
          username: data.username,
          email: data.email,
          roleId: Number(data.roleId),
          password: data.password,
          status: data.status === "Active",
        });

        if (success) {
          showToast("User berhasil ditambahkan", "success");
        } else {
          showToast("User gagal ditambahkan", "error");
        }
      }

      setOpenForm(false);
      await fetchUser();
    } catch (err) {
      console.error("Gagal menyimpan data user", err);
      const message = err instanceof Error ? err.message : "Gagal menyimpan data user";
      showToast(message, "error");
    }
  };

  // EDIT
  const handleEdit = (row: MasterUser) => {
    const selectedRole = roles.find((r) => r.roleName === row.role);

    setIsEdit(true);
    setSelectedId(row.id);
    setFormInit({
      username: row.username,
      email: row.email,
      roleId: selectedRole?.id ?? 0,
      status: row.status ? "Active" : "Inactive",
    });
    setOpenForm(true);
  };

  // DETAIL
  const handleDetail = (row: MasterUser) => {
    console.log("DETAIL USER:", row);
  };

  const confirmToggleStatus = async () => {
    if (!confirmStatus) return;

    try {
      const success = await masterUserService.toggleStatus(confirmStatus.id);

      if (success) {
        showToast(
          `Account "${confirmStatus.username}" berhasil ${
            confirmStatus.currentStatus ? "dinonaktifkan" : "diaktifkan"
          }`,
          "success"
        );

        setConfirmStatus(null);
        await fetchUser();
      } else {
        showToast("Gagal mengubah status account", "error");
      }
    } catch (err) {
      console.error("Gagal update status user", err);
      showToast("Gagal mengubah status account", "error");
    }
  };

  return (
    <AppShell
      title="Master User"
      subtitle="Kelola akun & hak akses pengguna"
    >
      <DataTable<MasterUser>
        title="Daftar Pengguna"
        columns={COLUMNS}
        data={users}
        addLabel="Tambah Pengguna"
        onAdd={() => {
          setIsEdit(false);
          setSelectedId(0);
          setFormInit({});
          setOpenForm(true);
        }}
        keyField="id"
        renderActions={(row) => (
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={() => handleDetail(row)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Detail
            </button>

            <button
              onClick={() => handleEdit(row)}
              className="px-2.5 py-1.5 border border-blue-200 rounded-md text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Edit
            </button>

           <button
            onClick={() =>
              setConfirmStatus({
                open: true,
                id: row.id,
                username: row.username,
                currentStatus: row.status,
              })
            }
            className={cn(
              "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors text-white",
              row.status
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            {row.status ? "Deactivate" : "Activate"}
          </button>
          </div>
        )}
      />

      <UserFormModal
        open={openForm}
        isEdit={isEdit}
        roles={roles}
        initialData={formInit}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      />

      {confirmStatus?.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div
              className={cn(
                "px-6 py-5 text-white",
                confirmStatus.currentStatus
                  ? "bg-red-600"
                  : "bg-emerald-600"
              )}
            >
              <h3 className="text-lg font-bold font-serif">
                {confirmStatus.currentStatus
                  ? "Deactivate Account?"
                  : "Activate Account?"}
              </h3>
              <p className="mt-1 text-sm opacity-90 font-serif">
                {confirmStatus.currentStatus
                  ? "User tidak akan bisa menggunakan account ini setelah dinonaktifkan."
                  : "User akan kembali bisa menggunakan account ini setelah diaktifkan."}
              </p>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 font-serif">
                Apakah kamu yakin ingin{" "}
                <span className="font-bold text-slate-900">
                  {confirmStatus.currentStatus ? "menonaktifkan" : "mengaktifkan"}
                </span>{" "}
                account{" "}
                <span className="font-bold text-slate-900">
                  {confirmStatus.username}
                </span>
                ?
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmStatus(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 font-serif"
              >
                Batal
              </button>

              <button
                onClick={confirmToggleStatus}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-semibold text-white font-serif",
                  confirmStatus.currentStatus
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {confirmStatus.currentStatus
                  ? "Ya, Deactivate"
                  : "Ya, Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-lg font-serif text-sm font-semibold",
          "flex items-center gap-2.5 transition-all duration-300",
          toast.type === "success"
            ? "bg-navy-900 text-gold-400 shadow-navy-900/30"
            : "bg-red-600 text-white shadow-red-600/30"
        )}>
          <span className={cn(
            "w-2 h-2 rounded-full",
            toast.type === "success" ? "bg-gold-400" : "bg-white"
          )} />
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}