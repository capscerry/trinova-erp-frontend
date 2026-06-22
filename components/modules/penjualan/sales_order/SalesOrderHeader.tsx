"use client";

import { useEffect, useState } from "react";
import {
  Hash, Calendar, User, Users, FileText, MapPin,
  RefreshCw, Pencil, FileDown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SalesOrderFormData,
  generateNomor,
  inputBase,
} from "./SalesOrderType";

import {
  customerService,
  type CustomerApi,
} from "@/lib/services/customer.service";

import { DropdownField } from "../../DropdownField";

interface SalesOrderHeaderFormProps {
  form: SalesOrderFormData;
  onChange: (patch: Partial<SalesOrderFormData>) => void;
  pelangganOptions?: { id: number; nama: string }[];
  salesOptions?: { id: number; nama: string }[];
  onOpenQuotationPicker?: () => void;
  isEdit?: boolean;
}

export function SalesOrderHeaderForm({
  form, onChange,
  pelangganOptions = [], salesOptions = [],
  onOpenQuotationPicker,
  isEdit = false,
}: SalesOrderHeaderFormProps) {
  const [nomorMode, setNomorMode] = useState<"auto" | "manual">("auto");
  const [nomorManual, setNomorManual] = useState("");

  const [customerOptions,setCustomerOptions] = useState<{id : number ; name :string}[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false); 

  const setField = <K extends keyof SalesOrderFormData>(k: K, v: SalesOrderFormData[K]) =>
    onChange({ [k]: v });

  const fetchCustomerData = async()=>{
    try{
        setLoadingCustomers(true);
        const data = await customerService.getAllActive();
        console.log("Fetched customers:", data);
        
        setCustomerOptions(
            data.map(
                (c) => ({
                     id: Number(c.id),
                     name: c.nama 
                }))
            );
    }catch(error){
        console.error("Error fetching customers:", error);
    }finally{
        setLoadingCustomers(false);
    }
  }
  
  useEffect(() => {
    fetchCustomerData();
    }, []);

  const handleRegenerateNomor   = () => onChange({ nomor: generateNomor() });
  const handleSwitchToManual    = () => { setNomorMode("manual"); setNomorManual(form.nomor); };
  const handleSwitchToAuto      = () => { setNomorMode("auto"); setNomorManual(""); onChange({ nomor: generateNomor() }); };
  const handleNomorManualChange = (v: string) => { setNomorManual(v); onChange({ nomor: v }); };



  return (
    <Section title="Informasi Dasar">

      {/* Nomor SO + No PO */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nomor SO" icon={<Hash size={13} />} required
          hint={
            isEdit ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                Tidak dapat diubah
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                  nomorMode === "auto" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {nomorMode === "auto" ? "Auto" : "Manual"}
                </span>
                {nomorMode === "auto" ? (
                  <button onClick={handleSwitchToManual}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-navy-700 transition-colors">
                    <Pencil size={10} /> Isi manual
                  </button>
                ) : (
                  <button onClick={handleSwitchToAuto}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-navy-700 transition-colors">
                    <RefreshCw size={10} /> Pakai auto
                  </button>
                )}
              </div>
            )
          }>
          {isEdit ? (
            <input readOnly disabled value={form.nomor}
              className={cn(inputBase, "bg-slate-50 text-slate-500 font-mono cursor-not-allowed")} />
          ) : nomorMode === "auto" ? (
            <div className="flex gap-2">
              <input readOnly value={form.nomor}
                className={cn(inputBase, "flex-1 bg-slate-50 text-slate-500 font-mono cursor-not-allowed")} />
              <button onClick={handleRegenerateNomor} title="Generate ulang"
                className="w-10 flex items-center justify-center rounded-lg border
                           border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-navy-700 transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
          ) : (
            <input type="text" value={nomorManual}
              onChange={(e) => handleNomorManualChange(e.target.value)}
              placeholder="Contoh: SO-2026-001"
              className={cn(inputBase, "font-mono")} />
          )}
        </FormField>

        {/* No PO */}
        <FormField label="No PO" icon={<Hash size={13} />}>
          <input type="text" 
            value={form.noPO || ""}
            onChange={(e) => setField("noPO", e.target.value)}
            placeholder="Nomor Purchase Order..."
            className={inputBase} />
        </FormField>
      </div>

      {/* Tanggal */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tanggal" icon={<Calendar size={13} />} required>
          <input type="date" value={form.tanggal}
            onChange={(e) => setField("tanggal", e.target.value)}
            className={inputBase} />
        </FormField>
        <FormField label="Tanggal Kirim" icon={<Calendar size={13} />}>
          <input type="date" value={form.tanggalKirim}
            onChange={(e) => setField("tanggalKirim", e.target.value)}
            className={inputBase} />
        </FormField>
      </div>

      {/* Pelanggan + Dipesan Oleh */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Dipesan Oleh" icon={<Users size={13} />} required
          hint={isEdit ? (
            <span className="text-[10px] text-slate-400">Tidak dapat diubah</span>
          ) : undefined}>
          <DropdownField
            value={form.pelanggan}
            placeholder="Pilih sales / staff..."
            options={customerOptions.map((s) => s.name)}
            disabled={isEdit}
            onChange={(v) => {
            const selected = customerOptions.find(
                (c) => c.name === v
            );

            onChange({
                pelanggan: v,
                customerId: selected?.id,
                // Reset quotation reference saat ganti customer
                quotationId: undefined,
                quotationNumber: undefined,
            });
            }}
          />
        </FormField>
      </div>

      {/* ── Ambil dari Penawaran Penjualan ──────────── */}
      <div className={cn(
        "rounded-xl border px-4 py-3 transition-all",
        form.customerId
          ? "border-sky-200 bg-sky-50/50"
          : "border-slate-200 bg-slate-50/50 opacity-60"
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileDown size={14} className={form.customerId ? "text-sky-600" : "text-slate-400"} />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-600">
                Ambil dari Penawaran Penjualan
              </span>
              {form.quotationNumber ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                                   bg-sky-100 text-sky-700 text-[11px] font-semibold font-mono">
                    {form.quotationNumber}
                    <button type="button"
                      onClick={() => onChange({ quotationId: undefined, quotationNumber: undefined })}
                      className="hover:text-sky-900 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {form.customerId
                    ? "Opsional — pilih penawaran untuk mengisi produk otomatis"
                    : "Pilih pelanggan terlebih dahulu"}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenQuotationPicker}
            disabled={!form.customerId}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0",
              "inline-flex items-center gap-1.5",
              form.customerId
                ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}>
            <FileDown size={11} />
            {form.quotationNumber ? "Ganti" : "Pilih"}
          </button>
        </div>
      </div>
      {/* Alamat + Keterangan */}
      <FormField label="Alamat Pengiriman" icon={<MapPin size={13} />}>
        <textarea value={form.alamatPengiriman}
          onChange={(e) => setField("alamatPengiriman", e.target.value)}
          placeholder="Alamat tujuan pengiriman..."
          rows={2} className={cn(inputBase, "resize-none")} />
      </FormField>
      <FormField label="Keterangan" icon={<FileText size={13} />}>
        <textarea value={form.keterangan}
          onChange={(e) => setField("keterangan", e.target.value)}
          placeholder="Catatan atau keterangan tambahan..."
          rows={2} className={cn(inputBase, "resize-none")} />
      </FormField>


        <div className="flex items-center gap-6 pt-1">
        {/* PPN (11%) */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.kenaPajak}
            onChange={(e) => setField("kenaPajak", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 font-medium">
            PPN (11%)
          </span>
        </label>
      </div>
    </Section>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
function FormField({ label, icon, hint, required, children }: {
  label: string; icon?: React.ReactNode;
  hint?: React.ReactNode; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-400 font-bold">*</span>}
        {hint && <span className="ml-auto">{hint}</span>}
      </label>
      {children}
    </div>
  );
}