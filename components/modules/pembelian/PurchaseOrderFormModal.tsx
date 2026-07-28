"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { notify } from "@/lib/notify";
import { useAuth } from "@/lib/AuthContext";
import { requestPurchaseOrderApproval } from "@/lib/services/po.service";
import {
  X, Hash, Calendar, Building2, Plus, ToggleLeft,
  CreditCard, Package, FileText, ArrowRight,
  ShieldCheck, Loader2, Check, ClipboardList, Search,
  CheckCircle2, AlertCircle, Clock, Trophy, Brain,
  BarChart2, Zap, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PurchaseOrderItemTable, { PurchaseOrderItem } from "./PurchaseOrderItemTable";
import { purchaseRequisitionService, type PurchaseRequisition } from "@/lib/services/purchase-requisition.service";
import { getNextPONumber } from "@/lib/services/po.service";
import { getNextGRNumber } from "@/lib/services/gr.service";
import { useSupplierRecommendations } from "@/lib/hooks/useSupplierRecommendations";

interface Supplier { id: string; nama: string; status?: string; }
interface Product {
  id: string; nama: string;
  supplier_id?: number; supplier_price?: number;
  available_stock?: number; lead_time_days?: number; uom_id?: number;
}
interface Uom { id: string; nama: string; }

export interface PurchaseOrderFormData {
  po_number: string; supplier_id: string; order_date: string;
  expected_date: string;
  status: string; total_amount: number;
  items: PurchaseOrderItem[]; deletedItems?: number[];
  purchase_order_id?: number;
  transaction_name: string;
  transaction_detail: string;
  nomor_faktur_pajak?: string;
}

interface PurchaseOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PurchaseOrderFormData) => Promise<any> | void;
  onApprove?: (poId: number, formData?: any) => Promise<any>;
  onCreateDP?: (data: any) => Promise<any>;
  onCreateGR?: (poId: number, receiptData: any, items: any[]) => Promise<any>;
  onCreateInvoice?: (data: any, poId: number, formData: any) => Promise<any>;
  onCreatePayment?: (data: any) => Promise<any>;
  onNavigateToInvoicePage?: () => void;
  /** Called when the user clicks "Down Payment" - navigate to the DP page pre-selecting this PO */
  onNavigateToDP?: (poId: number, poNumber: string) => void;
  /** Called when the user clicks "Goods Receipt" - navigate to the GR page pre-selecting this PO */
  onNavigateToGR?: (poId: number, poNumber: string) => void;
  /** Called when the user clicks "Purchase Invoice" - navigate to the Invoice/Payment page */
  onNavigateToInvoice?: (poId: number, poNumber: string) => void;
  suppliers: Supplier[];
  products: Product[];
  uoms: Uom[];
  purchaseOrderDetails?: any[];
  existingDownPayments?: any[];
  existingGoodsReceipts?: any[];
  existingInvoices?: any[];
  initialData?: PurchaseOrderFormData | null;
  prList?: PurchaseRequisition[];
}

// -------------------------------------------------------------
// Per-preset visual config (display only - no calculations here)
// -------------------------------------------------------------

const PRESET_ICONS: Record<string, { icon: React.ElementType; color: string; border: string }> = {
  balanced:        { icon: BarChart2,  color: "text-slate-600",  border: "border-slate-200 hover:border-slate-300"  },
  urgency_high:    { icon: Zap,        color: "text-rose-600",   border: "border-rose-200 hover:border-rose-300"    },
  budget_priority: { icon: CreditCard, color: "text-amber-600",  border: "border-amber-200 hover:border-amber-300"  },
  quality_focus:   { icon: Trophy,     color: "text-blue-600",   border: "border-blue-200 hover:border-blue-300"    },
};

const PROSES_LINKS = [
  {
    key: "persetujuan" as const,
    label: "Permohonan Persetujuan PO",
    desc: "Ajukan permohonan persetujuan Purchase Order ini",
    icon: ShieldCheck,
    color: "text-amber-600",
    bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  },
  {
    key: "uang-muka" as const,
    label: "Down Payment",
    desc: "Buat pembayaran uang muka supplier",
    icon: CreditCard,
    color: "text-violet-600",
    bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
  },
  {
    key: "goods-receipt" as const,
    label: "Goods Receipt",
    desc: "Terima barang dari supplier",
    icon: Package,
    color: "text-sky-600",
    bg: "bg-sky-50 hover:bg-sky-100 border-sky-200",
  },
  {
    key: "purchase-invoice" as const,
    label: "Purchase Invoice",
    desc: "Buat atau bayar tagihan supplier",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
  },
];

const todayStr = () => new Date().toISOString().split("T")[0];



const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);

/** Format a number as Rp 1.501.778,00 - thousands dots, comma decimals, always 2dp */
const formatAmount = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);

const newItem = (): PurchaseOrderItem => ({
  id: crypto.randomUUID(), product_id: "", product_name: "",
  quantity: 1, uom_id: "", uom_name: "", price: 0,
  tax_percent: 0, tax_amount: 0, subtotal: 0,
});

export default function PurchaseOrderFormModal({
  open, onClose, onSubmit, onApprove, onCreateDP, onCreateGR, onCreateInvoice,
  onCreatePayment, onNavigateToInvoicePage, onNavigateToDP, onNavigateToGR, onNavigateToInvoice,
  suppliers, products, uoms, purchaseOrderDetails = [],
  existingDownPayments = [], existingGoodsReceipts = [], existingInvoices = [],
  initialData, prList = [],
}: PurchaseOrderFormModalProps) {

  const isEdit = !!initialData;

  const { user } = useAuth();
  const isPembelianUser = user?.role === "pembelian" || user?.role === "procurement_manager";

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedPO, setSavedPO] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poNumberLoading, setPoNumberLoading] = useState(false);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const [dpOpen, setDpOpen] = useState(false);
  const [dpDone, setDpDone] = useState(false);
  const [dpSaving, setDpSaving] = useState(false);
  const [dpForm, setDpForm] = useState({
    payment_date: todayStr(), amount: 0, payment_type: "Partial", notes: "",
  });
  const [grOpen, setGrOpen] = useState(false);
  const [grDone, setGrDone] = useState(false);
  const [grSaving, setGrSaving] = useState(false);
  const [grSavedId, setGrSavedId] = useState<number | null>(null);
  const [grForm, setGrForm] = useState({
    receipt_number: "", receipt_date: todayStr(),
    received_by: "", status: "Received",
  });

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceDone, setInvoiceDone] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<any>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_date: todayStr(), amount: 0, payment_method: "Transfer", notes: "",
  });

  const [form, setForm] = useState<PurchaseOrderFormData>({
    po_number: "", supplier_id: "", order_date: todayStr(),
    expected_date: "", status: "Draft", total_amount: 0, items: [newItem()],
    transaction_name: "", transaction_detail: "",
  });
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [deletedItems, setDeletedItems] = useState<number[]>([]);

  // -- Shared AHP+TOPSIS recommendation dataset ------------------------------
  // Consumed from the singleton hook - no independent fetch or recalculation.
  const { loading: rankLoading, dataset: recommendationDataset } = useSupplierRecommendations();

  // -- PR (Purchase Requisition) picker state ---------------------------------
  const [prPickerOpen, setPrPickerOpen] = useState(false);
  const [prSearch, setPrSearch] = useState("");
  const [prLoading, setPrLoading] = useState(false);
  const [prItems, setPrItems] = useState<PurchaseRequisition[]>([]);
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);

  // Track whether the modal was just opened so only seed state once per open
  const wasOpenRef = useRef(false);

  // Seed done-states from existing records 
  const seedFromExisting = useCallback((poId: number) => {
    const approved = initialData?.status === "Approved" || initialData?.status === "Completed";
    setIsApproved(approved);
    setIsPendingApproval(initialData?.status === "Pending Approval");

    const existingGR = existingGoodsReceipts.find(
      (gr: any) => Number(gr.purchase_order_id) === poId
    );
    setGrDone(!!existingGR);
    setGrSavedId(existingGR?.goods_receipt_id ?? null);

    const existingDP = existingDownPayments.find(
      (dp: any) => Number(dp.purchase_order_id) === poId
    );
    setDpDone(!!existingDP);

    const grIds = existingGoodsReceipts
      .filter((gr: any) => Number(gr.purchase_order_id) === poId)
      .map((gr: any) => gr.goods_receipt_id);
    const existingInv = existingInvoices.find(
      (inv: any) => grIds.includes(inv.goods_receipt_id)
    );
    setInvoiceDone(!!existingInv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Reset on open/close toggle only
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setIsSubmitted(false); setSavedPO(null); setIsSubmitting(false); setPoNumberLoading(false);
      setApprovalOpen(false); setIsApproving(false);
      setIsPendingApproval(false);
      setDpOpen(false); setDpSaving(false);
      setDpForm({ payment_date: todayStr(), amount: 0, payment_type: "Partial", notes: "" });
      setGrOpen(false); setGrSaving(false);
      setGrForm({ receipt_number: "", receipt_date: todayStr(), received_by: "", status: "Received" });
      setInvoiceOpen(false); setInvoiceSaving(false); setSavedInvoice(null);
      setPaymentOpen(false); setPaymentDone(false); setPaymentSaving(false);
      setPaymentForm({ payment_date: todayStr(), amount: 0, payment_method: "Transfer", notes: "" });
      setDeletedItems([]);
      setPrPickerOpen(false); setPrSearch(""); setSelectedPR(null);

      // -- Fetch AHP-TOPSIS rankings: now provided by the shared hook -
      // No independent fetch or calculation on modal open.

      if (initialData) {
        // Normalize items and recompute tax_amount + subtotal so the grand total
        // always reflects the actual tax_percent (handles toggled-tax edge cases).
        const normalizedItems = (initialData.items ?? []).map(item => {
          const taxPct = item.tax_percent ?? (item as any).tax_percentage ?? 0;
          const base = (item.quantity ?? 0) * (item.price ?? 0);
          const taxAmount = base * (taxPct / 100);
          return {
            ...item,
            tax_percent: taxPct,
            tax_amount: taxAmount,
            subtotal: base + taxAmount,
          };
        });
        setForm({ ...initialData, items: normalizedItems });
        setFilteredProducts(products.filter(p => p.supplier_id?.toString() === initialData.supplier_id));
        seedFromExisting(initialData.purchase_order_id ?? 0);
      } else {
        setIsApproved(false);
        setIsPendingApproval(false);
        setDpDone(false); setGrDone(false); setGrSavedId(null); setInvoiceDone(false);
        setForm({ po_number: "", supplier_id: "", order_date: todayStr(), expected_date: "", status: "Draft", total_amount: 0, items: [newItem()], transaction_name: "", transaction_detail: "", nomor_faktur_pajak: "" });
        setFilteredProducts([]);
        // Fetch the real next PO number from the backend
        setPoNumberLoading(true);
        getNextPONumber()
          .then(res => setForm(prev => ({ ...prev, po_number: res?.po_number ?? res?.next_number ?? "" })))
          .catch(() => { /* leave blank if endpoint not available */ })
          .finally(() => setPoNumberLoading(false));
      }
    } else if (!open) {
      wasOpenRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !approvalOpen && !dpOpen && !grOpen) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, approvalOpen, dpOpen, grOpen]);

  // When a different PO is loaded for editing (initialData.purchase_order_id changes),
  // clear savedPO so it never bleeds over from a prior create/edit session.
  const prevInitialPOIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const newId = initialData?.purchase_order_id;
    if (newId !== prevInitialPOIdRef.current) {
      prevInitialPOIdRef.current = newId;
      setSavedPO(null);
    }
  }, [initialData?.purchase_order_id]);

  // Fetch next GR number when the GR sub-form is opened
  useEffect(() => {
    if (!grOpen) return;
    getNextGRNumber()
      .then(res => setGrForm(prev => ({ ...prev, receipt_number: res?.receipt_number ?? res?.next_number ?? "" })))
      .catch(() => { /* leave blank if endpoint not available */ });
  }, [grOpen]);

  const setField = <K extends keyof PurchaseOrderFormData>(key: K, val: PurchaseOrderFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const updateItem = (id: string, patch: Partial<PurchaseOrderItem>) =>
    setForm(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id !== id) return item;
        const u = { ...item, ...patch };
        const base = Number(u.quantity) * Number(u.price);
        const taxAmount = base * (Number(u.tax_percent) / 100);
        return { ...u, tax_amount: taxAmount, subtotal: base + taxAmount };
      });
      return { ...prev, items: updatedItems };
    });

  const removeItem = (id: string) => {
    const item = form.items.find(x => x.id === id);
    if (item?.purchase_order_detail_id)
      setDeletedItems(prev => [...prev, Number(item.purchase_order_detail_id)]);
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, newItem()] }));
  const grandTotal = form.items.reduce((acc, i) => acc + i.subtotal, 0);

  // For edits, always prefer the authoritative id from initialData (the server-side PO id)
  // so that a previously-created PO's savedPO state never bleeds into a subsequent edit.
  const poId: number = isEdit
    ? (initialData?.purchase_order_id ?? 0)
    : (savedPO?.purchase_order_id ?? 0);
  const supplierName = suppliers.find(s => s.id === form.supplier_id)?.nama ?? "";
  const poLineItems = purchaseOrderDetails.filter(d => Number(d.purchase_order_id) === poId);
  const prosesActive = isSubmitted || (isEdit && !!poId);
  const isCompleted = form.status === "Completed";
  // Treat as approved if the status field is Approved/Completed, or if approved in this session
  const effectivelyApproved = isApproved || form.status === "Approved" || form.status === "Completed";
  // Treat as pending approval if the status is Pending Approval (awaiting Procurement Manager)
  const effectivelyPending = isPendingApproval || form.status === "Pending Approval";

  // Find the invoice that belongs to this PO.
  const poGrIds = existingGoodsReceipts
    .filter((gr: any) => Number(gr.purchase_order_id) === poId)
    .map((gr: any) => gr.goods_receipt_id);

  const invoiceFromProps = existingInvoices.find(
    (inv: any) =>
      Number(inv.purchase_order_id) === poId ||
      poGrIds.includes(inv.goods_receipt_id)
  ) ?? null;

  const poInvoice: any = invoiceFromProps ?? savedInvoice ?? null;
  const poInvoiceOutstanding = Number(poInvoice?.outstanding_amount ?? 0);

  const totalDpPaid = (() => {
    const dpsForPO = existingDownPayments
      .filter((dp: any) => Number(dp.purchase_order_id) === poId);
    // Use the most recently saved DP amount, not a cumulative sum
    const latestDp = dpsForPO.length > 0
      ? Math.round(Number(dpsForPO[dpsForPO.length - 1].amount ?? 0) * 100) / 100
      : 0;
    const sessionDp = dpDone && dpsForPO.length === 0 ? (dpForm.amount || 0) : 0;
    return Math.round((latestDp + sessionDp) * 100) / 100;
  })();


  const effectiveOutstanding = poInvoice
    ? poInvoiceOutstanding
    : Math.max(0, grandTotal - totalDpPaid);

  const handleSavePO = async () => {
    // If PO number hasn't loaded yet, fetch it now before proceeding
    if (!isEdit && !form.po_number) {
      setPoNumberLoading(true);
      try {
        const res = await getNextPONumber();
        const poNum = res?.po_number ?? res?.next_number ?? "";
        if (!poNum) throw new Error("Gagal mendapatkan nomor PO dari server.");
        setForm(prev => ({ ...prev, po_number: poNum }));
        // Use the freshly fetched number immediately (don't rely on the state update timing)
        setIsSubmitting(true);
        const payload = { ...form, po_number: poNum, total_amount: grandTotal, deletedItems };
        setPoNumberLoading(false);
        // Fall through to the create path directly
        try {
          const result = await onSubmit(payload);
          const saved = result ?? payload;
          setSavedPO(saved);
          if (saved?.po_number && saved.po_number !== poNum) {
            setForm(prev => ({ ...prev, po_number: saved.po_number }));
          }
          setIsSubmitted(true);
          notify.success("Purchase Order tersimpan", `${saved?.po_number ?? poNum} berhasil dibuat sebagai Draft`);
          toast.success(
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[14px] text-gold-400">Purchase Order tersimpan</span>
              <span className="text-[12px] text-slate-300">{saved?.po_number ?? poNum} berhasil dibuat sebagai Draft</span>
            </div>,
            { duration: 5000 }
          );
        } catch (err: any) {
          notify.error("Gagal menyimpan PO", err?.message ?? "Terjadi kesalahan, coba lagi");
          toast.error(
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[14px] text-red-400">Gagal menyimpan PO</span>
              <span className="text-[12px] text-slate-300">{err?.message ?? "Terjadi kesalahan, coba lagi"}</span>
            </div>,
            { duration: 6000 }
          );
        } finally {
          setIsSubmitting(false);
        }
        return;
      } catch (err: any) {
        setPoNumberLoading(false);
        notify.error("Gagal mendapatkan nomor PO", err?.message ?? "Coba lagi");
        return;
      }
    }

    setIsSubmitting(true);
    const payload = { ...form, total_amount: grandTotal, deletedItems };
    if (isEdit) {
      try {
        await onSubmit(payload);
        notify.success("Purchase Order diperbarui", `${form.po_number} berhasil disimpan`);
        toast.success(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[14px] text-gold-400">Purchase Order diperbarui</span>
            <span className="text-[12px] text-slate-300">{form.po_number} berhasil disimpan</span>
          </div>,
          { duration: 5000 }
        );
        onClose();
      } catch (err: any) {
        notify.error("Gagal memperbarui PO", err?.message ?? "Terjadi kesalahan, coba lagi");
        toast.error(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[14px] text-red-400">Gagal memperbarui PO</span>
            <span className="text-[12px] text-slate-300">{err?.message ?? "Terjadi kesalahan, coba lagi"}</span>
          </div>,
          { duration: 6000 }
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const result = await onSubmit(payload);
        const saved = result ?? payload;
        setSavedPO(saved);
        if (saved?.po_number && saved.po_number !== form.po_number) {
          setForm(prev => ({ ...prev, po_number: saved.po_number }));
        }
        setIsSubmitted(true);
        notify.success("Purchase Order tersimpan", `${saved?.po_number ?? form.po_number} berhasil dibuat sebagai Draft`);
        toast.success(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[14px] text-gold-400">Purchase Order tersimpan</span>
            <span className="text-[12px] text-slate-300">{saved?.po_number ?? form.po_number} berhasil dibuat sebagai Draft</span>
          </div>,
          { duration: 5000 }
        );
      } catch (err: any) {
        notify.error("Gagal menyimpan PO", err?.message ?? "Terjadi kesalahan, coba lagi");
        toast.error(
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[14px] text-red-400">Gagal menyimpan PO</span>
            <span className="text-[12px] text-slate-300">{err?.message ?? "Terjadi kesalahan, coba lagi"}</span>
          </div>,
          { duration: 6000 }
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleApprove = async () => {
    if (!poId) return;
    setIsApproving(true);
    try {
      if (isPembelianUser) {
        // Pembelian user: submit an approval REQUEST to Procurement Manager
        await requestPurchaseOrderApproval(poId);
        setIsPendingApproval(true);
        setForm(prev => ({ ...prev, status: "Pending Approval" }));
        setApprovalOpen(false);
      } else {
        // Admin or any role that can directly approve
        if (!onApprove) return;
        await onApprove(poId, { ...form, total_amount: grandTotal });
        setIsApproved(true);
        setForm(prev => ({ ...prev, status: "Approved" }));
        setApprovalOpen(false);
      }
    } catch (err: any) {
      notify.error(err?.message ?? "Permohonan gagal");
      toast.error(err?.message ?? "Permohonan gagal");
    } finally { setIsApproving(false); }
  };

  const handleSaveDP = async () => {
    if (!onCreateDP) return;
    setDpSaving(true);
    try {
      await onCreateDP({
        purchase_order_id: poId,
        supplier_id: Number(form.supplier_id) || 0,
        payment_date: dpForm.payment_date,
        amount: dpForm.amount,
        payment_type: dpForm.payment_type,
        notes: dpForm.notes,
        status: "Paid",
        transaction_name: form.transaction_name ?? "",
        transaction_detail: form.transaction_detail ?? "",
      });
      setDpDone(true);
      setDpOpen(false);
    } catch { /* parent handles */ }
    finally { setDpSaving(false); }
  };

  const handleSaveGR = async () => {
    if (!onCreateGR) return;
    setGrSaving(true);
    try {
      const result = await onCreateGR(poId, {
        purchase_order_id: poId,
        receipt_number: grForm.receipt_number,
        receipt_date: grForm.receipt_date,
        received_by: grForm.received_by,
        status: grForm.status,
        transaction_name: form.transaction_name ?? "",
        transaction_detail: form.transaction_detail ?? "",
      }, poLineItems);
      setGrSavedId(result?.goods_receipt_id ?? null);
      setGrDone(true);
      setGrOpen(false);
    } catch { /* parent handles */ }
    finally { setGrSaving(false); }
  };

  const handleSaveInvoice = async () => {
    if (!onCreateInvoice) return;
    setInvoiceSaving(true);
    try {
      const result = await onCreateInvoice(
        {
          goods_receipt_id: grSavedId ?? 0,
          supplier_id: Number(form.supplier_id) || 0,
          total_amount: grandTotal,
          transaction_name: form.transaction_name ?? "",
          transaction_detail: form.transaction_detail ?? "",
        },
        poId,
        { ...form, total_amount: grandTotal }
      );
      const apiOutstanding = result?.outstanding_amount ?? result?.data?.outstanding_amount ?? null;
      const apiDpPaid      = result?.dp_paid ?? result?.data?.dp_paid ?? null;
      const invoiceId      = result?.purchase_invoice_id ?? result?.id ?? 0;
      const outstandingAmt = apiOutstanding ?? Math.max(0, grandTotal - totalDpPaid);

      setSavedInvoice({
        purchase_invoice_id: invoiceId,
        invoice_number:      result?.invoice_number ?? "",
        total_amount:        grandTotal,
        dp_paid:             apiDpPaid ?? totalDpPaid,
        outstanding_amount:  outstandingAmt,
        goods_receipt_id:    grSavedId ?? 0,
      });
      setInvoiceDone(true);

      // If the user already filled in a payment amount, immediately record
      // the payment - no need for a second click.
      if (paymentForm.amount > 0 && invoiceId && onCreatePayment) {
        await onCreatePayment({
          purchase_invoice_id: invoiceId,
          payment_date: paymentForm.payment_date,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes,
          status: "Paid",
          _outstanding_amount: outstandingAmt,
          transaction_name: form.transaction_name ?? "",
          transaction_detail: form.transaction_detail ?? "",
        });
        setPaymentDone(true);
      }

      setInvoiceOpen(false);
    } catch (err) {
      console.error("Invoice/payment error:", err);
    } finally {
      setInvoiceSaving(false);
    }
  };

  const handleSavePayment = async (invoiceId: number, outstandingAmount: number) => {
    if (!onCreatePayment) return;
    setPaymentSaving(true);
    try {
      await onCreatePayment({
        purchase_invoice_id: invoiceId,
        payment_date: paymentForm.payment_date,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
        status: "Paid",
        _outstanding_amount: outstandingAmount,
        transaction_name: form.transaction_name ?? "",
        transaction_detail: form.transaction_detail ?? "",
      });
      // Only mark done / close sub-modal if not navigating away.
      // If the parent navigates, the whole modal unmounts anyway.
      setPaymentDone(true);
      setInvoiceOpen(false);
    } catch (err) {
      console.error("Payment error:", err);
    } finally {
      setPaymentSaving(false);
    }
  };

  // -- PR Picker handlers -----------------------------------------------------
  const handleOpenPrPicker = async () => {
    setPrPickerOpen(true);
    setPrSearch("");
    // Prefer the list passed as a prop; fall back to fetching live if empty.
    if (prList.length > 0) {
      setPrItems(prList);
      return;
    }
    setPrLoading(true);
    try {
      const data = await purchaseRequisitionService.getAll();
      setPrItems(data);
    } catch {
      setPrItems([]);
    } finally {
      setPrLoading(false);
    }
  };

  const handleSelectPR = async (pr: PurchaseRequisition) => {
    // If the record already has details embedded, use them immediately.
    // Otherwise, fetch the full record by id to get line items.
    let fullPR = pr;
    if (!pr.details || pr.details.length === 0) {
      try {
        fullPR = await purchaseRequisitionService.getById(pr.id);
      } catch {
        fullPR = pr;
      }
    }

    setSelectedPR(fullPR);

    // Map PR detail lines - PO item rows
    if (fullPR.details && fullPR.details.length > 0) {
      const mappedItems: PurchaseOrderItem[] = fullPR.details.map(d => {
        // Look up in ALL products (not just supplier-filtered) for name/uom/price
        const prod = products.find(p => p.id === String(d.product_id));
        const uomMatch = uoms.find(u =>
          u.id === String(d.uom_id ?? prod?.uom_id ?? "")
        );
        const price = prod?.supplier_price ?? 0;
        const qty = d.qty_requested ?? 1;
        const subtotal = qty * price;
        return {
          id: crypto.randomUUID(),
          product_id: String(d.product_id),
          product_name: d.product_name || prod?.nama || `Product ${d.product_id}`,
          isExisting: false,
          quantity: qty,
          uom_id: uomMatch?.id ?? String(prod?.uom_id ?? ""),
          uom_name: uomMatch?.nama ?? "",
          price,
          tax_percent: 0,
          tax_amount: 0,
          subtotal,
        };
      });
      setForm(prev => ({ ...prev, items: mappedItems }));

      // Build the product list for the dropdown
      const baseList = form.supplier_id
        ? products.filter(p => p.supplier_id?.toString() === form.supplier_id)
        : [];

      const prProductIds = new Set(fullPR.details.map(d => String(d.product_id)));
      const missingFromBase = products.filter(
        p => prProductIds.has(p.id) && !baseList.some(b => b.id === p.id)
      );

      // If a PR product isn't in the supplier-product list at all, synthesise a minimal entry 
      const syntheticEntries = fullPR.details
        .filter(d => !products.some(p => p.id === String(d.product_id)))
        .map(d => ({
          id: String(d.product_id),
          nama: d.product_name || `Product ${d.product_id}`,
          supplier_price: 0,
          available_stock: undefined as number | undefined,
          lead_time_days: undefined as number | undefined,
          uom_id: d.uom_id,
        }));

      const combined = [...baseList, ...missingFromBase, ...syntheticEntries];

      // Deduplicate by product id
      const seen = new Set<string>();
      setFilteredProducts(combined.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }));
    }

    setPrPickerOpen(false);
  };

  const handleNavigate = (key: typeof PROSES_LINKS[number]["key"]) => {
    if (key === "persetujuan") { setApprovalOpen(true); return; }
    if (key === "uang-muka") {
      // Each PO may only have one Down Payment - block if one already exists.
      if (dpDone) return;
      if (onNavigateToDP) { onClose(); onNavigateToDP(poId, form.po_number); return; }
      setDpOpen(true); return;
    }
    if (key === "goods-receipt") {
      if (onNavigateToGR) { onClose(); onNavigateToGR(poId, form.po_number); return; }
      setGrOpen(true); return;
    }
    if (key === "purchase-invoice") {
      if (onNavigateToInvoice) { onClose(); onNavigateToInvoice(poId, form.po_number); return; }
      // Pre-seed payment amount with effective outstanding balance
      if (effectiveOutstanding > 0) {
        setPaymentForm(f => ({ ...f, amount: effectiveOutstanding }));
      }
      setInvoiceOpen(true);
      return;
    }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[15px] tracking-tight">
                {isEdit ? "Edit Purchase Order" : "Tambah Purchase Order"}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                {isEdit ? "Perbarui data purchase order" : "Buat pesanan pembelian baru"}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {isSubmitted && savedPO && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">Purchase Order berhasil disimpan sebagai Draft.</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-emerald-700">
                  <p>No PO: <span className="font-semibold">{savedPO.po_number ?? form.po_number}</span></p>
                  <p>Total: <span className="font-semibold">{formatRupiah(grandTotal)}</span></p>
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  Anda dapat menutup modal ini - PO tersimpan sebagai Draft. Lanjutkan dengan Persetujuan PO di bawah jika diperlukan.
                </p>
              </div>
            )}

            <Section title="Informasi Purchase Order">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="PO Number" icon={<Hash size={13} />}>
                  <input readOnly value={form.po_number} placeholder="Otomatis" className={cn(inputBase, "bg-slate-50 text-slate-500 placeholder-slate-400")} />
                </FormField>
                <FormField label="Nomor Faktur Pajak" icon={<Hash size={13} />}>
                  {(() => {
                    const hasTax = form.items.some(i => (i.tax_percent ?? 0) > 0);
                    return (
                      <>
                        <input
                          type="text"
                          value={form.nomor_faktur_pajak ?? ""}
                          onChange={e => setField("nomor_faktur_pajak", e.target.value)}
                          placeholder={hasTax ? "Contoh: FP-0000000001" : "Isi pajak pada item terlebih dahulu"}
                          disabled={!hasTax}
                          className={cn(
                            inputBase,
                            !hasTax && "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                          )}
                        />
                        {!hasTax && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Nomor Faktur Pajak tersedia setelah ada item dengan pajak &gt; 0%.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </FormField>
                <FormField label="Tanggal Ekspektasi" icon={<Calendar size={13} />} required>
                  <input type="date" value={form.expected_date}
                    onChange={e => setField("expected_date", e.target.value)}
                    className={inputBase}
                    placeholder="Pilih tanggal ekspektasi..." />
                </FormField>
                <FormField label="Tanggal" icon={<Calendar size={13} />}>
                  <input readOnly value={form.order_date}
                    className={cn(inputBase, "bg-slate-50 text-slate-500 cursor-default")} />
                </FormField>
              </div>

              {/* -- AHP-TOPSIS Supplier Recommendations (new PO only) ----------- */}
              {!isEdit && !rankLoading && recommendationDataset && recommendationDataset.presets.length > 0 && (
                <div className="rounded-xl border border-gold-200 bg-gradient-to-br from-gold-50 to-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gold-400/20 flex items-center justify-center shrink-0">
                      <Brain size={12} className="text-gold-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gold-800">
                        Rekomendasi Supplier ┬╖ AHP+TOPSIS
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        Supplier terbaik berdasarkan 4 strategi prioritas
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {recommendationDataset.presets.map((preset) => {
                      const top = preset.rankedSuppliers[0];
                      const supplierId = top?.alternativeId ?? "";
                      const cfg = PRESET_ICONS[preset.key] ?? PRESET_ICONS.balanced;
                      const Icon = cfg.icon;
                      const isSelected = form.supplier_id === supplierId;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            if (supplierId) {
                              setField("supplier_id", supplierId);
                              setFilteredProducts(products.filter((prod: any) => prod.supplier_id?.toString() === supplierId));
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all",
                            isSelected
                              ? "bg-white border-gold-400 ring-2 ring-gold-300 ring-offset-1 shadow-sm"
                              : cn("bg-white/60 hover:bg-white hover:shadow-sm", cfg.border)
                          )}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-gold-100" : "bg-slate-50")}>
                            <Icon size={13} className={isSelected ? "text-gold-600" : cfg.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[10px] uppercase tracking-widest font-bold truncate", isSelected ? "text-gold-700" : "text-slate-400")}>
                              {preset.label}
                            </p>
                            <p className={cn("text-[12px] font-semibold truncate leading-tight mt-0.5", isSelected ? "text-navy-900" : "text-slate-700")}>
                              {top?.name ?? "-"}
                            </p>
                          </div>
                          <span className={cn("text-[10px] font-bold tabular-nums shrink-0", isSelected ? "text-gold-600" : "text-slate-400")}>
                            {(top?.score ?? 0).toFixed(3)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isEdit && rankLoading && (
                <div className="rounded-xl border border-gold-200 bg-gradient-to-br from-gold-50 to-amber-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw size={12} className="text-gold-600 animate-spin" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gold-800">
                      Memuat Rekomendasi...
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[62px] bg-white/60 rounded-lg border border-gold-200 animate-pulse" />
                    ))}
                  </div>
                </div>
              )}

              <FormField label="Supplier" icon={<Building2 size={13} />} required>
                {isEdit ? (
                  <input value={supplierName} disabled className={cn(inputBase, "bg-slate-50 text-slate-500 cursor-not-allowed")} />
                ) : (
                  <SelectField
                    value={supplierName}
                    placeholder="Pilih supplier..."
                    options={suppliers
                      .filter(s => !s.status || s.status === "Active")
                      .map(s => s.nama)}
                    onChange={value => {
                      const sel = suppliers.find(s => s.nama === value);
                      const sid = sel?.id ?? "";
                      setField("supplier_id", sid);
                      setFilteredProducts(products.filter((p: any) => p.supplier_id?.toString() === sid));
                    }}
                  />
                )}
              </FormField>

              <FormField label="Status" icon={<ToggleLeft size={13} />}>
                <div className="flex gap-2">
                  {["Draft", "Approved", "Completed"].map(status => (
                    <button key={status} type="button"
                      disabled={isCompleted}
                      onClick={() => setField("status", status)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        form.status === status
                          ? "bg-navy-900 text-gold-400 border-navy-900"
                          : "bg-white border-slate-200 text-slate-400"
                      )}>
                      {status}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Transaction Name">
                <input
                  type="text"
                  value={form.transaction_name ?? ""}
                  onChange={e => setField("transaction_name", e.target.value)}
                  placeholder="Nama transaksi..."
                  className={inputBase}
                />
              </FormField>

              <FormField label="Transaction Detail">
                <textarea
                  rows={3}
                  value={form.transaction_detail ?? ""}
                  onChange={e => setField("transaction_detail", e.target.value)}
                  placeholder="Detail transaksi..."
                  className={cn(inputBase, "resize-none")}
                />
              </FormField>
            </Section>

            {/* -- Ambil dari PR banner (new PO only) ----------------------- */}
            {!isEdit && !isCompleted && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ClipboardList size={16} className="text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      {selectedPR ? `PR dipilih: ${selectedPR.nomor}` : "Ambil dari Purchase Requisition"}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {selectedPR
                        ? `${selectedPR.details.length} item dimuat dari PR - Opsional, ubah item di bawah jika diperlukan`
                        : "Opsional - pilih PR untuk mengisi item produk secara otomatis"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPrPicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                >
                  <ClipboardList size={12} /> {selectedPR ? "Ganti PR" : "Pilih"}
                </button>
              </div>
            )}

            <Section title="Detail Item" action={
              !isCompleted && (
                <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 text-gold-400">
                  <Plus size={12} /> Tambah Baris
                </button>
              )
            }>
              <PurchaseOrderItemTable items={form.items} products={filteredProducts} uoms={uoms}
                onUpdateItem={updateItem} onRemoveItem={removeItem} />
              <div className="flex justify-end mt-3">
                <div className="bg-navy-900 text-white rounded-xl px-5 py-3 min-w-[220px]">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total</span>
                    <span className="text-base font-bold text-gold-400">{formatRupiah(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </Section>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Proses Ke</h3>
              </div>

              <p className="text-xs text-slate-400 mb-2">
                {prosesActive
                  ? "Lanjutkan proses dari Purchase Order ini ke dokumen berikut."
                  : "Simpan Purchase Order terlebih dahulu untuk mengaktifkan proses lanjutan."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                {PROSES_LINKS.filter(l => l.key === "persetujuan" || l.key === "uang-muka").map(({ key: _key, label, desc, icon: Icon, color, bg }) => { const key = _key as typeof PROSES_LINKS[number]["key"];
                  // Persetujuan: active as soon as PO is saved/editing but not if Completed or pending/approved already
                  // Uang Muka: only active after truly Approved (not just Pending Approval), not if Completed, not if DP exists
                  const isActive = !isCompleted && (
                    key === "persetujuan"
                      ? prosesActive && !effectivelyApproved && !effectivelyPending
                      : prosesActive && effectivelyApproved && !dpDone
                  );

                  const isDone =
                    (key === "persetujuan" && (effectivelyApproved || effectivelyPending)) ||
                    (key === "uang-muka" && dpDone) ||
                    (key === "goods-receipt" && grDone) ||
                    (key === "purchase-invoice" && invoiceDone);

                  return (
                    <button
                      key={key}
                      disabled={!isActive}
                      onClick={() => isActive && handleNavigate(key)}
                      className={cn(
                        "flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all",
                        isDone
                          ? cn(bg, "cursor-default ring-2 ring-offset-1",
                              key === "persetujuan" ? "ring-amber-300"
                              : key === "uang-muka" ? "ring-violet-300"
                              : key === "goods-receipt" ? "ring-sky-300"
                              : "ring-emerald-300")
                          : isActive
                            ? cn(bg, "cursor-pointer")
                            : isCompleted
                              ? "bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed"
                              : "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isActive ? "bg-white/70" : "bg-slate-100")}>
                          <Icon size={15} className={isActive ? color : "text-slate-400"} />
                        </div>
                        {/* For persetujuan: show clock icon if pending, check if approved */}
                        {key === "persetujuan" && effectivelyPending && !effectivelyApproved
                          ? <Clock size={13} className="text-amber-500" />
                          : isDone
                            ? <Check size={13} className={color} />
                            : isActive
                              ? <ArrowRight size={13} className={color} />
                              : null
                        }
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", isActive ? "text-slate-800" : "text-slate-500")}>{label}</p>
                        {/* Show "Menunggu persetujuan" hint when pending */}
                        {key === "persetujuan" && effectivelyPending && !effectivelyApproved
                          ? <p className="text-[10px] text-amber-600 mt-0.5 leading-snug font-semibold">Menunggu persetujuan PO</p>
                          : <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>

              {!prosesActive && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2">
                  <Check size={10} className="text-slate-300" />
                  Tombol akan aktif setelah PO berhasil disimpan
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              {isCompleted || (isSubmitted && !isEdit) ? "Tutup" : "Batal"}
            </button>
            {!isCompleted && (
              <button onClick={handleSavePO} disabled={isSubmitting || poNumberLoading || (isSubmitted && !isEdit)}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 hover:bg-navy-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {(isSubmitting || poNumberLoading) && <Loader2 size={13} className="animate-spin" />}
                {poNumberLoading ? "Memuat nomor PO..." : isSubmitted ? "Tersimpan" : isEdit ? "Simpan Perubahan" : "Buat Purchase Order"}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* -- PR Picker sub-modal (z-60) -------------------------------------- */}
      {prPickerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[58]" onClick={() => setPrPickerOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[80vh] flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
                <div>
                  <h2 className="text-white font-semibold text-[15px]">Pilih Purchase Requisition</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Pilih PR untuk mengisi item produk secara otomatis</p>
                </div>
                <button onClick={() => setPrPickerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Search bar */}
              <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Cari nomor atau keterangan PR..."
                    value={prSearch}
                    onChange={e => setPrSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500"
                  />
                </div>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {prLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Memuat data PR...</span>
                  </div>
                ) : (() => {
                  const filtered = prItems.filter(pr =>
                    pr.nomor.toLowerCase().includes(prSearch.toLowerCase()) ||
                    pr.keterangan.toLowerCase().includes(prSearch.toLowerCase()) ||
                    (pr.warehouse_name ?? "").toLowerCase().includes(prSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <ClipboardList size={28} className="mb-2 opacity-30" />
                        <p className="text-sm">Tidak ada Purchase Requisition ditemukan</p>
                      </div>
                    );
                  }
                  return (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 z-10">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Nomor</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Tanggal</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Warehouse</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Remarks</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(pr => (
                          <tr key={pr.id}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-semibold text-[12px] text-navy-700">{pr.nomor}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                              {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(pr.tanggal))}
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{pr.warehouse_name || "-"}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{pr.keterangan || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border",
                                pr.status === "Processed"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : pr.status === "Requested" || pr.status === "REQUESTED"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : pr.status === "Partially processed"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : pr.status === "Cancelled"
                                  ? "bg-rose-50 text-rose-600 border-rose-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}>
                                {pr.status || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleSelectPR(pr)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-navy-900 text-gold-400 hover:bg-navy-700 transition-colors"
                              >
                                Pilih
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <button onClick={() => setPrPickerOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                  Batal
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {approvalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[58]" onClick={() => setApprovalOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
                <div>
                  <h2 className="text-white font-semibold text-[15px]">
                    {isPembelianUser ? "Permohonan Persetujuan PO" : "Persetujuan Purchase Order"}
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {isPembelianUser ? "Ajukan PO ke Procurement Manager" : "Ubah status PO menjadi Approved"}
                  </p>
                </div>
                <button onClick={() => setApprovalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                  <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {isPembelianUser ? "Konfirmasi Permohonan" : "Konfirmasi Persetujuan"}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {isPembelianUser
                        ? <>Mengajukan PO <span className="font-bold">{form.po_number}</span> ke Procurement Manager untuk disetujui. PO tidak dapat dilanjutkan ke Down Payment sebelum disetujui.</>
                        : <>Menyetujui PO <span className="font-bold">{form.po_number}</span> akan mengaktifkan proses Uang Muka, Goods Receipt, dan Purchase Invoice.</>
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">No PO</label>
                  <input readOnly value={form.po_number} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</label>
                  <input readOnly value={supplierName} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total PO</label>
                  <input readOnly value={formatRupiah(grandTotal)} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
                <button onClick={() => setApprovalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button onClick={handleApprove} disabled={isApproving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-lg disabled:opacity-60 transition-colors">
                  {isApproving ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  {isPembelianUser ? "Ajukan Permohonan" : "Setujui PO"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -- Down Payment sub-modal (z-60) -- */}
      {dpOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[58]" onClick={() => setDpOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-600">
                <div>
                  <h2 className="text-white font-semibold text-[15px]">Tambah Purchase Down Payment</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Catat pembayaran uang muka supplier</p>
                </div>
                <button onClick={() => setDpOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Purchase Order</label>
                  <input readOnly value={form.po_number} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Supplier</label>
                  <input readOnly value={supplierName} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total PO</label>
                  <input readOnly value={formatRupiah(grandTotal)} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Payment Date</label>
                  <input type="date" value={dpForm.payment_date}
                    onChange={e => setDpForm(f => ({ ...f, payment_date: e.target.value }))} className={inputBase} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmount(dpForm.amount)}
                    onFocus={e => { e.target.value = dpForm.amount > 0 ? String(dpForm.amount) : ""; e.target.select(); }}
                    onBlur={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const parsed = parseFloat(raw);
                      setDpForm(f => ({ ...f, amount: isNaN(parsed) ? 0 : parsed }));
                      e.target.value = formatAmount(isNaN(parsed) ? 0 : parsed);
                    }}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      if (!/^[0-9]*\.?[0-9]*$/.test(raw)) return;
                      setDpForm(f => ({ ...f, amount: raw === "" || raw === "." ? 0 : parseFloat(raw) }));
                    }}
                    className={inputBase}
                  />
                  {dpForm.payment_type === "Partial" && dpForm.amount > grandTotal && (
                    <p className="text-xs text-red-500 mt-1">Amount tidak boleh melebihi total PO.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Payment Type</label>
                  <select value={dpForm.payment_type}
                    onChange={e => setDpForm(f => ({ ...f, payment_type: e.target.value, amount: e.target.value === "Full" ? grandTotal : f.amount }))}
                    className={inputBase}>
                    <option value="Partial">Partial</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</label>
                  <textarea rows={3} value={dpForm.notes}
                    onChange={e => setDpForm(f => ({ ...f, notes: e.target.value }))}
                    className={cn(inputBase, "resize-none")} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
                <button onClick={() => setDpOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                <button onClick={handleSaveDP}
                  disabled={dpSaving || (dpForm.payment_type === "Partial" && dpForm.amount > grandTotal)}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 rounded-lg disabled:opacity-60">
                  {dpSaving && <Loader2 size={13} className="animate-spin" />} Simpan DP
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -- Goods Receipt sub-modal (z-60) -- */}
      {grOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[58]" onClick={() => setGrOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
                <div>
                  <h2 className="text-white font-semibold text-[15px]">Goods Receipt</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Catat penerimaan barang dari supplier</p>
                </div>
                <button onClick={() => setGrOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">No Receipt</label>
                    <input readOnly value={grForm.receipt_number} placeholder="Otomatis" className={cn(inputBase, "bg-slate-50 text-slate-500 placeholder-slate-400")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">No PO</label>
                    <input readOnly value={form.po_number} placeholder="Otomatis" className={cn(inputBase, "bg-slate-50 text-slate-500 placeholder-slate-400")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal Terima</label>
                  <input type="date" value={grForm.receipt_date}
                    onChange={e => setGrForm(f => ({ ...f, receipt_date: e.target.value }))} className={inputBase} />
                </div>

                {/* Tanggal Ekspektasi reference - always visible so user can see the PO deadline */}
                {(() => {
                  const expDate  = form.expected_date;
                  const rcptDate = grForm.receipt_date;
                  const status   = expDate && rcptDate
                    ? (rcptDate <= expDate ? "on_time" : "late")
                    : "unknown";
                  const formatDateId = (d: string) =>
                    new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));
                  return (
                    <div className={cn(
                      "rounded-xl border px-4 py-3 flex items-start gap-3",
                      status === "on_time" ? "bg-emerald-50 border-emerald-200"
                        : status === "late" ? "bg-rose-50 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="mt-0.5 shrink-0">
                        {status === "on_time" && <CheckCircle2 size={15} className="text-emerald-600" />}
                        {status === "late"    && <AlertCircle  size={15} className="text-rose-500" />}
                        {status === "unknown" && <Clock        size={15} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold uppercase tracking-wide",
                          status === "on_time" ? "text-emerald-700"
                            : status === "late" ? "text-rose-600"
                            : "text-slate-500"
                        )}>
                          Tanggal Ekspektasi (dari PO)
                        </p>
                        <p className={cn(
                          "text-sm font-semibold mt-0.5",
                          status === "on_time" ? "text-emerald-800"
                            : status === "late" ? "text-rose-700"
                            : "text-slate-700"
                        )}>
                          {expDate ? formatDateId(expDate) : "Tidak diset pada PO ini"}
                        </p>
                        {status !== "unknown" && (
                          <p className={cn(
                            "text-xs mt-1",
                            status === "on_time" ? "text-emerald-600" : "text-rose-500"
                          )}>
                            {status === "on_time"
                              ? "Tepat waktu - akan dicatat sebagai on-time di scoring AHP-TOPSIS"
                              : "Terlambat - akan dicatat sebagai late di scoring AHP-TOPSIS"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diterima Oleh</label>
                  <input type="text" value={grForm.received_by} placeholder="Nama penerima..."
                    onChange={e => setGrForm(f => ({ ...f, received_by: e.target.value }))} className={inputBase} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <div className="flex gap-2">
                    {["Received", "Partial", "Cancelled"].map(s => (
                      <button key={s} type="button"
                        onClick={() => setGrForm(f => ({ ...f, status: s }))}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                          grForm.status === s ? "bg-navy-900 text-gold-400 border-navy-900" : "bg-white border-slate-200 text-slate-500")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {poLineItems.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Item yang akan diterima</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-3 py-2 text-left text-slate-400 font-semibold">Produk</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right text-slate-400 font-semibold">Subtotal</th>
                      </tr></thead>
                      <tbody>{poLineItems.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 text-slate-700">{item.product?.product_name ?? `Product ${item.product_id}`}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">{formatRupiah(item.subtotal ?? 0)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <button onClick={() => setGrOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                <button onClick={handleSaveGR} disabled={grSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 rounded-lg disabled:opacity-60">
                  {grSaving && <Loader2 size={13} className="animate-spin" />} Simpan Goods Receipt
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {invoiceOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[58]" onClick={() => setInvoiceOpen(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-navy-900 to-navy-600 shrink-0">
                <div>
                  <h2 className="text-white font-semibold text-[15px]">
                    {invoiceDone || poInvoice ? "Tambah Purchase Payment" : "Purchase Invoice & Payment"}
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {invoiceDone || poInvoice ? "Catat pembayaran invoice supplier" : "Buat invoice dan catat pembayaran sekaligus"}
                  </p>
                </div>
                <button onClick={() => setInvoiceOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Invoice</label>
                  <input readOnly
                    value={
                      poInvoice
                        ? `${poInvoice.invoice_number ?? "-"} | Outstanding: ${formatRupiah(effectiveOutstanding)}`
                        : invoiceDone
                          ? `${savedInvoice?.invoice_number ?? "-"} | Outstanding: ${formatRupiah(effectiveOutstanding)}`
                          : "Akan dibuat otomatis saat menyimpan"
                    }
                    className={cn(inputBase, "bg-slate-50 text-slate-600")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</label>
                  <input readOnly value={supplierName} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice Amount</label>
                  <input readOnly value={formatRupiah(grandTotal)} className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">DP Paid</label>
                  <input readOnly
                    value={formatRupiah(Number(poInvoice?.dp_paid ?? totalDpPaid ?? 0))}
                    className={cn(inputBase, "bg-slate-50 text-slate-500")} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding Amount</label>
                  <input readOnly
                    value={formatRupiah(effectiveOutstanding)}
                    className={cn(
                      inputBase,
                      effectiveOutstanding > 0
                        ? "bg-amber-50 text-amber-700 font-semibold"
                        : "bg-slate-50 text-slate-500"
                    )} />
                </div>

                {(invoiceDone || poInvoice) && effectiveOutstanding === 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-700">- Invoice telah lunas - tidak ada sisa tagihan.</p>
                  </div>
                )}

                {!grSavedId && !poInvoice && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="text-xs text-amber-700">Selesaikan Goods Receipt terlebih dahulu agar invoice terhubung ke GR.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-semibold uppercase tracking-wide",
                    effectiveOutstanding > 0 ? "text-slate-500" : "text-slate-300")}>
                    Payment Date
                  </label>
                  <input type="date"
                    disabled={effectiveOutstanding === 0}
                    value={paymentForm.payment_date}
                    onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className={cn(inputBase, effectiveOutstanding === 0 && "bg-slate-50 text-slate-300 cursor-not-allowed")} />
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-semibold uppercase tracking-wide",
                    effectiveOutstanding > 0 ? "text-slate-500" : "text-slate-300")}>
                    Payment Amount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={effectiveOutstanding === 0}
                    value={effectiveOutstanding === 0 ? "" : formatAmount(paymentForm.amount)}
                    onFocus={e => { e.target.value = paymentForm.amount > 0 ? String(paymentForm.amount) : ""; e.target.select(); }}
                    onBlur={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const parsed = parseFloat(raw);
                      setPaymentForm(f => ({ ...f, amount: isNaN(parsed) ? 0 : parsed }));
                      e.target.value = formatAmount(isNaN(parsed) ? 0 : parsed);
                    }}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      if (!/^[0-9]*\.?[0-9]*$/.test(raw)) return;
                      setPaymentForm(f => ({ ...f, amount: raw === "" || raw === "." ? 0 : parseFloat(raw) }));
                    }}
                    className={cn(inputBase, effectiveOutstanding === 0 && "bg-slate-50 text-slate-300 cursor-not-allowed")}
                  />
                  {effectiveOutstanding > 0 && paymentForm.amount > effectiveOutstanding && (
                    <p className="text-xs text-red-500 mt-1">Nominal tidak boleh melebihi outstanding amount.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-semibold uppercase tracking-wide",
                    effectiveOutstanding > 0 ? "text-slate-500" : "text-slate-300")}>
                    Payment Method
                  </label>
                  <select
                    disabled={effectiveOutstanding === 0}
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className={cn(inputBase, effectiveOutstanding === 0 && "bg-slate-50 text-slate-300 cursor-not-allowed")}>
                    <option value="Transfer">Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Giro">Giro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-semibold uppercase tracking-wide",
                    effectiveOutstanding > 0 ? "text-slate-500" : "text-slate-300")}>
                    Notes
                  </label>
                  <textarea rows={3}
                    disabled={effectiveOutstanding === 0}
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    className={cn(inputBase, "resize-none", effectiveOutstanding === 0 && "bg-slate-50 text-slate-300 cursor-not-allowed")} />
                </div>

              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <button onClick={() => setInvoiceOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                  Batal
                </button>

                {!invoiceDone && !poInvoice && (
                  <button onClick={handleSaveInvoice} disabled={invoiceSaving}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 rounded-lg disabled:opacity-60">
                    {invoiceSaving && <Loader2 size={13} className="animate-spin" />}
                    {paymentForm.amount > 0 ? "Simpan Invoice & Payment" : "Simpan Invoice"}
                  </button>
                )}

                {(invoiceDone || poInvoice) && effectiveOutstanding > 0 && (
                  <button
                    onClick={() => handleSavePayment(poInvoice?.purchase_invoice_id ?? savedInvoice?.purchase_invoice_id ?? 0, effectiveOutstanding)}
                    disabled={paymentSaving || paymentForm.amount <= 0 || paymentForm.amount > effectiveOutstanding}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gold-400 bg-navy-900 rounded-lg disabled:opacity-60">
                    {paymentSaving && <Loader2 size={13} className="animate-spin" />} Simpan Payment
                  </button>
                )}

                {(invoiceDone || poInvoice) && effectiveOutstanding === 0 && (
                  <button onClick={() => setInvoiceOpen(false)}
                    className="px-5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                    Tutup
                  </button>
                )}
              </div>

            </div>
          </div>
        </>
      )}

    </>
  );
}

function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, icon, required, children }: {
  label: string; icon?: React.ReactNode; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value, placeholder, options, onChange }: {
  value: string; placeholder: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn("w-full flex items-center justify-between gap-2 border border-slate-200 bg-white text-left transition-all focus:outline-none focus:ring-2 focus:ring-navy-600/20 focus:border-navy-500 px-3 py-2.5 rounded-lg text-sm",
          value ? "text-slate-700" : "text-slate-400")}>
        <span className="truncate">{value || placeholder}</span>
        <span className={cn("text-slate-400 transition-transform text-xs", open && "rotate-180")}>-</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-full max-h-48 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }}
                className={cn("w-full text-left px-4 py-2 text-xs transition-colors",
                  opt === value ? "bg-navy-900 text-gold-400 font-semibold" : "text-slate-600 hover:bg-slate-50")}>
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const inputBase = `w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none`;
