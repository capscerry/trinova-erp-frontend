"use client";

import { AppShell } from "@/components/layout";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useEffect, useState } from "react";

import {
  MasterUser,
  MasterRole,
  masterUserService,
  roleService
} from "@/lib/services/user.service";

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
  const [users, setUsers] = useState<MasterUser[]>([]);
  const [roles, setRoles] = useState<MasterRole[]>([]);
  const [loading, setLoading] = useState(true);

  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(0);
  const [formInit, setFormInit] = useState<Partial<UserFormData>>({});

  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);
 
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // FETCH API GET ALL USER
  const fetchUser = async () => {
    setLoading(true);

    try {
      const result = await masterUserService.getAll();

      setUsers(result);
    } catch (err) {
      console.error("Gagal mengambil data user", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchRoleForModal();
  }, []);

  const fetchRoleForModal = async ()=>{
    try{
        const result = await roleService.getAll();
        console.log(result);
        setRoles(result)
    }catch(err){
        console.error("Gagal mengambil data role", err);
        showToast("Gagal mengambil data role", "error");
    }
  }

  // SUBMIT
  const handleSubmit = async (data: UserFormData) => {
    console.log("SUBMIT USER:", data);
  };

  // EDIT
  const handleEdit = async (row: MasterUser) => {
    console.log("EDIT USER:", row);

    setIsEdit(true);
    setSelectedId(row.id);

    setFormInit({
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status ? "Active" : "Inactive"
    });

    setOpenForm(true);
  };

  // DETAIL
  const handleDetail = async (row: MasterUser) => {
    console.log("DETAIL USER:", row);
  };

  // DELETE
  const handleDelete = async (
    id: number,
    username: string
  ) => {
    console.log("DELETE USER:", {
      id,
      username,
    });
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

          console.log("OPEN ADD USER FORM");
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
                handleDelete(row.id, row.username)
              }
              className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-semibold transition-colors"
            >
              Hapus
            </button>
          </div>
        )}
      />


      <UserFormModal
        open = {openForm}
        isEdit = {isEdit}
        roles={roles}
        initialData={formInit}
        onClose={()=>setOpenForm(false)}
        onSubmit={handleSubmit}
      />

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