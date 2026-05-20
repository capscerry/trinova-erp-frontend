"use client";

import { useEffect, useState } from "react";
import {
  Hash, Calendar, User, Users, FileText, MapPin,
  RefreshCw, Pencil,
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
}

export function SalesOrderHeaderForm({
  form, onChange,
  pelangganOptions = [], salesOptions = [],
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
        const data = await customerService.getAll();
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

      {/* Nomor SO */}
      <FormField label="Nomor SO" icon={<Hash size={13} />} required
        hint={
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
        }>
        {nomorMode === "auto" ? (
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
        <FormField label="Dipesan Oleh" icon={<Users size={13} />} required>
          <DropdownField
            value={form.pelanggan}
            placeholder="Pilih sales / staff..."
            options={customerOptions.map((s) => s.name)}
            onChange={(v) => {
            const selected = customerOptions.find(
                (c) => c.name === v
            );

            onChange({
                pelanggan: v,
                customerId: selected?.id,
            });
            }}
          />
        </FormField>
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
        {/* Kena Pajak */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.kenaPajak}
            onChange={(e) => setField("kenaPajak", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700 font-medium">
            Kena Pajak
          </span>
        </label>

        {/* Total Termasuk Pajak */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.totalTermasukPajak}
            onChange={(e) =>
              setField("totalTermasukPajak", e.target.checked)
            }
            disabled={!form.kenaPajak}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="text-sm text-slate-700 font-medium">
            Total termasuk Pajak
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