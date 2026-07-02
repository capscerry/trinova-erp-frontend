"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BarChart2, CreditCard, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSuppliers } from "@/lib/services/supplier.service";
import { getPurchaseOrders } from "@/lib/services/po.service";
import { getGoodsReceipts } from "@/lib/services/gr.service";
import { getPurchaseReturns } from "@/lib/services/purchase-return.service";
import { getSupplierProducts } from "@/lib/services/supplier-product.service";
import {
  PRIORITY_PRESETS,
  applyPreset,
  calcDeliveryPunctuality,
  calcOnTimeRates,
  topsis,
  type Alternative,
} from "@/lib/ahp-topsis";

type PreviewVariant = "dark" | "light";

interface AhpTopsisBestPreviewProps {
  variant?: PreviewVariant;
  className?: string;
  showTitle?: boolean;
}

interface PresetWinner {
  presetKey: string;
  presetLabel: string;
  supplierName: string;
  score: number;
}

const AHP_CRITERIA = [
  { id: "avg_price", label: "Harga Rata-rata", description: "", weight: 0.2, benefit: false },
  { id: "lead_time", label: "Lead Time", description: "", weight: 0.2, benefit: false },
  { id: "on_time_rate", label: "On-Time Rate", description: "", weight: 0.2, benefit: true },
  { id: "delivery_punctuality", label: "Ketepatan Waktu", description: "", weight: 0.2, benefit: true },
  { id: "return_rate", label: "Tingkat Retur", description: "", weight: 0.2, benefit: false },
];

const PRESET_UI: Record<string, { icon: any; dark: string; light: string; tag: string }> = {
  balanced: {
    icon: BarChart2,
    dark: "border-l-slate-400 bg-white/5 border-white/10",
    light: "border-l-slate-400 bg-slate-50 border-slate-200",
    tag: "SEIMBANG",
  },
  urgency_high: {
    icon: Zap,
    dark: "border-l-rose-400 bg-rose-400/10 border-rose-300/20",
    light: "border-l-rose-400 bg-rose-50 border-rose-200",
    tag: "URGENSI TINGGI",
  },
  budget_priority: {
    icon: CreditCard,
    dark: "border-l-amber-400 bg-amber-400/10 border-amber-300/20",
    light: "border-l-amber-400 bg-amber-50 border-amber-200",
    tag: "PRIORITAS BUDGET",
  },
  quality_focus: {
    icon: Trophy,
    dark: "border-l-blue-400 bg-blue-400/10 border-blue-300/20",
    light: "border-l-blue-400 bg-blue-50 border-blue-200",
    tag: "FOKUS KUALITAS",
  },
};

function buildAlternatives(
  suppliers: any[],
  pos: any[],
  grs: any[],
  returns: any[],
  supplierProducts: any[]
): Alternative[] {
  const normPos = pos.map((p: any) => ({
    purchase_order_id: Number(p.purchase_order_id ?? p.id ?? 0),
    supplier_id: Number(p.supplier_id ?? p.supplier?.supplier_id ?? 0),
    order_date: p.order_date ?? p.orderDate ?? null,
    expected_date: p.expected_date ?? p.expectedDate ?? null,
  }));

  const normGrs = grs.map((g: any) => ({
    goods_receipt_id: Number(g.goods_receipt_id ?? g.id ?? 0),
    purchase_order_id: Number(g.purchase_order_id ?? g.purchaseOrderId ?? 0),
    receipt_date: g.receipt_date ?? g.receiptDate ?? null,
  }));

  const normReturns = returns.map((r: any) => ({
    supplier_id: Number(r.supplier_id ?? r.supplierId ?? 0),
    goods_receipt_id: Number(r.goods_receipt_id ?? r.goodsReceiptId ?? 0),
  }));

  const normSupplierProducts = supplierProducts.map((sp: any) => ({
    supplier_id: Number(sp.supplier_id ?? sp.supplierId ?? 0),
    supplier_price: Number(sp.supplier_price ?? sp.price ?? 0),
    lead_time_days: sp.lead_time_days != null ? Number(sp.lead_time_days) : null,
  }));

  const onTimeRates = calcOnTimeRates(normPos as any, normGrs as any);
  const punctuality = calcDeliveryPunctuality(normPos as any, normGrs as any);

  return suppliers.map((supplier: any) => {
    const supplierId = Number(supplier.supplier_id ?? supplier.id ?? 0);
    const products = normSupplierProducts.filter((sp: any) => sp.supplier_id === supplierId);
    const supplierReturns = normReturns.filter((r: any) => r.supplier_id === supplierId);
    const supplierGrs = normGrs.filter((gr: any) => {
      const po = normPos.find((p: any) => p.purchase_order_id === gr.purchase_order_id);
      return po?.supplier_id === supplierId;
    });

    const avgPrice = products.length
      ? products.reduce((sum: number, sp: any) => sum + Number(sp.supplier_price || 0), 0) / products.length
      : 0;

    const leadTimes = products
      .map((sp: any) => sp.lead_time_days)
      .filter((value: any) => value != null && !Number.isNaN(Number(value)));

    const avgLeadTime = leadTimes.length
      ? leadTimes.reduce((sum: number, value: any) => sum + Number(value), 0) / leadTimes.length
      : 0;

    const returnRate = supplierGrs.length ? supplierReturns.length / supplierGrs.length : 0;

    return {
      id: String(supplierId),
      name: supplier.supplier_name ?? supplier.nama ?? supplier.name ?? "Unknown Supplier",
      values: {
        avg_price: avgPrice,
        lead_time: avgLeadTime,
        on_time_rate: onTimeRates.get(supplierId) ?? 0,
        delivery_punctuality: punctuality.get(supplierId) ?? 0,
        return_rate: returnRate,
      },
    };
  });
}

function normalizeSettled(result: PromiseSettledResult<any>): any[] {
  if (result.status !== "fulfilled") return [];
  if (Array.isArray(result.value)) return result.value;
  return result.value?.data ?? [];
}

function ScoreBar({ score, variant }: { score: number; variant: PreviewVariant }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-1.5 w-16 overflow-hidden rounded-full", variant === "dark" ? "bg-white/10" : "bg-slate-200")}>
        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(8, Math.min(score * 100, 100))}%` }} />
      </div>
      <span className={cn("text-[10px] font-bold", variant === "dark" ? "text-white" : "text-navy-900")}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}

function WinnerCard({ winner, variant }: { winner: PresetWinner; variant: PreviewVariant }) {
  const ui = PRESET_UI[winner.presetKey] ?? PRESET_UI.balanced;
  const Icon = ui.icon;

  return (
    <div className={cn(
      "min-w-[170px] flex-1 rounded-xl border border-l-2 px-3 py-2.5",
      variant === "dark" ? ui.dark : ui.light
    )}>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={10} className={variant === "dark" ? "text-white/50" : "text-slate-400"} />
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-widest",
          variant === "dark" ? "bg-white/10 text-white" : "bg-white/70 text-navy-800"
        )}>
          {ui.tag}
        </span>
      </div>

      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-[9px] font-extrabold text-navy-900">
          1
        </span>
        <p className={cn("truncate text-[12px] font-bold leading-tight", variant === "dark" ? "text-white" : "text-navy-900")}>
          {winner.supplierName}
        </p>
      </div>

      <div className="mt-1.5 pl-5">
        <ScoreBar score={winner.score} variant={variant} />
      </div>
    </div>
  );
}

function SkeletonCard({ variant }: { variant: PreviewVariant }) {
  return (
    <div className={cn(
      "min-w-[170px] flex-1 animate-pulse rounded-xl border border-l-2 px-3 py-2.5",
      variant === "dark" ? "border-white/10 border-l-white/20 bg-white/5" : "border-slate-200 border-l-slate-300 bg-slate-50"
    )}>
      <div className={cn("mb-2 h-3 w-20 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
      <div className={cn("mb-1.5 h-4 w-28 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
      <div className={cn("ml-5 h-1.5 w-16 rounded", variant === "dark" ? "bg-white/10" : "bg-slate-200")} />
    </div>
  );
}

export function AhpTopsisBestPreview({ variant = "dark", className, showTitle = true }: AhpTopsisBestPreviewProps) {
  const [winners, setWinners] = useState<PresetWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setHasError(false);

      try {
        const [supplierResult, poResult, grResult, returnResult, supplierProductResult] = await Promise.allSettled([
          getSuppliers(),
          getPurchaseOrders(),
          getGoodsReceipts(),
          getPurchaseReturns(),
          getSupplierProducts(),
        ]);

        if (cancelled) return;

        const suppliers = normalizeSettled(supplierResult);
        const alternatives = buildAlternatives(
          suppliers,
          normalizeSettled(poResult),
          normalizeSettled(grResult),
          normalizeSettled(returnResult),
          normalizeSettled(supplierProductResult)
        );

        const nextWinners = PRIORITY_PRESETS.map((preset) => {
          const { result } = applyPreset(preset.key as any);
          const criteria = AHP_CRITERIA.map((criterion, index) => ({ ...criterion, weight: result.weights[index] }));
          const ranked = topsis(alternatives, criteria).sort((a, b) => b.score - a.score);
          const best = ranked[0];

          return {
            presetKey: preset.key,
            presetLabel: preset.label,
            supplierName: best?.name ?? "-",
            score: best?.score ?? 0,
          };
        });

        setWinners(nextWinners);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasError) {
    return (
      <div className={cn("mt-4 flex items-center gap-2 text-[11px]", variant === "dark" ? "text-rose-300" : "text-rose-600", className)}>
        <AlertCircle size={12} />
        Gagal memuat data ranking supplier.
      </div>
    );
  }

  return (
    <div className={cn(variant === "dark" ? "mt-5 border-t border-white/10 pt-4" : "mt-3", className)}>
      {showTitle && (
        <p className={cn("mb-2.5 text-[9px] font-bold uppercase tracking-widest", variant === "dark" ? "text-slate-400" : "text-slate-400")}>
          Supplier Terbaik per Profil AHP-TOPSIS
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} variant={variant} />)
        ) : winners.length === 0 ? (
          <p className={cn("py-2 text-[11px]", variant === "dark" ? "text-slate-400" : "text-slate-500")}>
            Belum ada data supplier untuk diranking.
          </p>
        ) : (
          winners.map((winner) => <WinnerCard key={winner.presetKey} winner={winner} variant={variant} />)
        )}
      </div>
    </div>
  );
}