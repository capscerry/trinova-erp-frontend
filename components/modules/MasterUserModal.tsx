"use client";

import { useEffect, useState } from "react";
import { X, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { MasterRole } from "@/lib/services/user.service";

export interface UserFormData {
  username: string;
  email: string;
  roleId: number;
  password: string;
  confirmPassword: string;
  status: "Active" | "Inactive";
}

interface UserFormModalProps {
  open: boolean;
  isEdit: boolean;
  roles: MasterRole[];
  initialData?: Partial<UserFormData>;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
}

const EMPTY_FORM: UserFormData = {
  username: "",
  email: "",
  roleId: 0,
  password: "",
  confirmPassword: "",
  status: "Active",
};

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5 font-serif">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-serif">{error}</p>}
    </div>
  );
}

function inputCls(err?: string) {
  return cn(
    "w-full px-3 py-2.5 text-sm rounded-lg border font-serif transition-all outline-none",
    "placeholder-slate-300 text-slate-700",
    err
      ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      : "border-slate-200 bg-slate-50 focus:border-navy-500 focus:ring-2 focus:ring-navy-100 focus:bg-white"
  );
}

function disabledCls(isDisabled: boolean) {
  return isDisabled && "bg-slate-100 text-slate-400 cursor-not-allowed";
}

export function UserFormModal({
  open,
  isEdit,
  roles,
  initialData,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormData, string>>
  >({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initialData });
      setErrors({});
      setShowPass(false);
      setShowConfirm(false);
    }
  }, [open, initialData]);

  const handleChange = (
    field: keyof UserFormData,
    value: string | number
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof UserFormData, string>> = {};

    if (!form.username.trim()) {
      errs.username = "Username wajib diisi";
    }

    if (!form.email.trim()) {
      errs.email = "Email wajib diisi";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errs.email = "Format email tidak valid";
    }

    if (!form.roleId || Number(form.roleId) === 0) {
      errs.roleId = "Role wajib dipilih";
    }

        if (!isEdit) {
      if (!form.password) {
        errs.password = "Password wajib diisi";
      } else if (form.password.length < 8) {
        errs.password = "Password minimal 8 karakter";
      } else if (!/[A-Z]/.test(form.password)) {
        errs.password = "Password harus memiliki minimal 1 huruf besar";
      } else if (!/[a-z]/.test(form.password)) {
        errs.password = "Password harus memiliki minimal 1 huruf kecil";
      } else if (!/[0-9]/.test(form.password)) {
        errs.password = "Password harus memiliki minimal 1 angka";
      }

      if (form.password !== form.confirmPassword) {
        errs.confirmPassword = "Konfirmasi password tidak cocok";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      await onSubmit({
        ...form,
        roleId: Number(form.roleId),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-[560px] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-navy-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-500/20 flex items-center justify-center">
              <User size={16} className="text-gold-400" />
            </div>

            <div>
              <h2 className="font-bold text-white text-[15px] font-serif">
                {isEdit ? "Edit Pengguna" : "Tambah Pengguna"}
              </h2>
              <p className="text-slate-400 text-[11px] mt-0.5 font-serif">
                {isEdit
                  ? "Hanya email dan role yang dapat diubah"
                  : "Buat akun pengguna baru"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username" required error={errors.username}>
              <input
                type="text"
                value={form.username}
                disabled={isEdit}
                onChange={(e) =>
                  handleChange(
                    "username",
                    e.target.value.toLowerCase().replace(/\s/g, "")
                  )
                }
                placeholder="username"
                className={cn(inputCls(errors.username), disabledCls(isEdit))}
              />
            </Field>

            <Field label="Email" required error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@contoh.com"
                className={inputCls(errors.email)}
              />
            </Field>
          </div>

          <Field label="Role" required error={errors.roleId}>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleChange("roleId", r.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    Number(form.roleId) === r.id
                      ? "border-navy-600 bg-navy-900 text-white"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Shield
                      size={14}
                      className={
                        Number(form.roleId) === r.id
                          ? "text-gold-400"
                          : "text-slate-400"
                      }
                    />
                    <span className="text-sm font-semibold font-serif">
                      {r.roleName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
                        <Field
              label={isEdit ? "Password" : "Password"}
              required={!isEdit}
              error={errors.password}
            >
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  disabled={isEdit}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder={isEdit ? "Tidak bisa diubah" : "Min. 8 karakter"}
                  className={cn(
                    inputCls(errors.password),
                    "pr-16",
                    disabledCls(isEdit)
                  )}
                />

                {!isEdit && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    {showPass ? "hide" : "show"}
                  </button>
                )}
              </div>

              {!isEdit && !errors.password && (
                <p className="text-[11px] text-slate-400 mt-1 font-serif">
                  Minimal 8 karakter, kombinasi huruf besar, huruf kecil, dan angka.
                </p>
              )}
            </Field>

            <Field
              label="Konfirmasi Password"
              required={!isEdit}
              error={errors.confirmPassword}
            >
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  disabled={isEdit}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  placeholder={isEdit ? "Tidak bisa diubah" : "Ulangi password"}
                  className={cn(
                    inputCls(errors.confirmPassword),
                    "pr-16",
                    disabledCls(isEdit)
                  )}
                />

                {!isEdit && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    {showConfirm ? "hide" : "show"}
                  </button>
                )}
              </div>
            </Field>
          </div>

          <Field label="Status Akun">
            <div className="flex gap-3">
              {(["Active", "Inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isEdit}
                  onClick={() => handleChange("status", s)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-serif transition-all",
                    form.status === s
                      ? s === "Active"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                        : "bg-slate-100 border-slate-400 text-slate-600"
                      : "border-slate-200 text-slate-400 hover:border-slate-300",
                    isEdit && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      s === "Active" ? "bg-emerald-500" : "bg-slate-400"
                    )}
                  />
                  {s === "Active" ? "Aktif" : "Nonaktif"}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors font-serif"
          >
            Batal
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold rounded-lg text-navy-900 font-serif",
              "bg-gradient-to-b from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400",
              "shadow-sm transition-all",
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            {loading
              ? "Menyimpan..."
              : isEdit
              ? "Simpan Perubahan"
              : "Tambah"}
          </button>
        </div>
      </div>
    </div>
  );
}