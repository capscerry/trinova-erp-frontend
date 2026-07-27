"use client";

import { SalesOrderModal } from "@/components/modules/penjualan/SalesOrderModal";
import { UangMukaModal } from "@/components/modules/penjualan/uang_muka/UangMukaModal";
import { PengirimanModal } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanModal";
import { FakturPenjualanModal } from "@/components/modules/penjualan/faktur_penjualan/FakturPenjualanModal";
import { PenerimaanModal } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanModal";
import { useWorkflowDraft, type DraftKey } from "@/lib/WorkflowDraftContext";

import type { SalesOrderFormData, WorkflowSalesOrderData } from "@/components/modules/penjualan/sales_order/SalesOrderType";
import type { UangMukaFormData } from "@/components/modules/penjualan/uang_muka/UangMukaType";
import type { PengirimanFormData } from "@/components/modules/penjualan/pengiriman_penjualan/PengirimanType";
import type { FakturPenjualanFormData } from "@/components/modules/penjualan/faktur_penjualan/FakturPenjualanType";
import type { PenerimaanFormData } from "@/components/modules/penjualan/penerimaan_penjualan/PenerimaanPenjualanType";

type DraftSalesOrder = Partial<SalesOrderFormData> & Record<string, unknown>;
type DraftItem = Record<string, unknown>;

const getString = (source: Record<string, unknown> | undefined, keys: string[]) => {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
};

const getNumber = (source: Record<string, unknown> | undefined, keys: string[]) => {
  if (!source) return 0;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) return Number(value) || 0;
  }
  return 0;
};

const getBool = (source: Record<string, unknown> | undefined, keys: string[]) => {
  if (!source) return false;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
  }
  return false;
};

const getItems = (so: DraftSalesOrder | undefined): DraftItem[] => {
  const items = so?.items;
  return Array.isArray(items) ? (items as unknown as DraftItem[]) : [];
};

export function TransactionOrchestrator() {
  const {
    draft,
    setDraftPart,
    activeModal,
    openModal,
    closeModal,
    hasDraftPart,
  } = useWorkflowDraft();

  const isSaved = (key: DraftKey) => hasDraftPart(key);

  const getSalesOrderTotal = (so: DraftSalesOrder): number => {
    const items = getItems(so);

    const grossAmount = items.reduce((sum, item) => {
      const qty = getNumber(item, ["qty", "quantity", "productQty"]);
      const harga = getNumber(item, ["harga", "unitPrice", "price", "productPrice"]);
      return sum + qty * harga;
    }, 0);

    const discountTotal = items.reduce((sum, item) => {
      const qty = getNumber(item, ["qty", "quantity", "productQty"]);
      const harga = getNumber(item, ["harga", "unitPrice", "price", "productPrice"]);
      const diskonPercent = getNumber(item, ["diskon", "discountPercent"]);
      return sum + qty * harga * (diskonPercent / 100);
    }, 0);

    const taxableBase = grossAmount - discountTotal;
    const kenaPajak = getBool(so, ["kenaPajak", "isTaxAble", "isTaxable"]);
    const taxAmount = kenaPajak ? taxableBase * 0.11 : 0;

    return taxableBase + taxAmount;
  };

  const handleSONavigate = (
    target: "uang-muka" | "pengiriman" | "faktur" | "penerimaan",
    data: WorkflowSalesOrderData
  ) => {
    setDraftPart("salesOrder", data as SalesOrderFormData & Record<string, unknown>);

    if (target === "uang-muka") openModal("uangMuka");
    if (target === "pengiriman") openModal("pengiriman");
    if (target === "faktur") openModal("faktur");
    if (target === "penerimaan") openModal("penerimaan");
  };

  const handleUMSubmit = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
  };

  const handleUMProses = (data: UangMukaFormData) => {
    setDraftPart("uangMuka", data);
    openModal("penerimaan");
  };

  const handlePengirimanSubmit = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
  };

  const handlePengirimanProses = (data: PengirimanFormData) => {
    setDraftPart("pengiriman", data);
    openModal("faktur");
  };

  const handleFakturSubmit = (data: FakturPenjualanFormData) => {
    setDraftPart("faktur", data);
  };

  const handleFakturProses = (data: FakturPenjualanFormData & { remainingAmount?: number }) => {
    setDraftPart("faktur", data);
    openModal("penerimaan");
  };

  const handlePenerimaanSubmit = (data: PenerimaanFormData) => {
    setDraftPart("penerimaan", data);
    closeModal();
  };

  const so = draft.salesOrder as DraftSalesOrder | undefined;
  const uangMuka = draft.uangMuka as (Partial<UangMukaFormData> & Record<string, unknown>) | undefined;
  const pengiriman = draft.pengiriman as (Partial<PengirimanFormData> & Record<string, unknown>) | undefined;
  const faktur = draft.faktur as (Partial<FakturPenjualanFormData> & Record<string, unknown>) | undefined;
  const salesOrderId = getNumber(so, ["orderId", "salesOrderId", "id"]);
  const salesOrderNumber = getString(so, ["noPesanan", "nomor", "soNumber", "orderNumber"]);

  const uangMukaInitialData: Partial<UangMukaFormData> | undefined =
    draft.uangMuka ??
    (so
      ? {
          id: 0,
          customerId: getNumber(so, ["customerId", "customer_id"]) || undefined,
          pelanggan: getString(so, ["pelanggan", "customerName"]),
          noFaktur: "",
          noFakturMode: "auto" as const,
          tanggal: new Date().toISOString().split("T")[0],
          uangMuka: getNumber(so, ["totalHargaPesanan"]) || getSalesOrderTotal(so),
          noPO: getString(so, ["noPO", "poNumber"]),
          noSo: salesOrderNumber,
          salesOrderId: salesOrderId || undefined,
          noPesanan: salesOrderNumber,
          syaratPembayaran: "",
          alamat: getString(so, ["alamatPengiriman", "address"]),
          keterangan: getString(so, ["keterangan", "notes"]),
          fakturType: "Faktur Penjualan",
          // Pakai totalHargaPesanan yang SUDAH dihitung SalesOrderModal dari
          // total resmi backend — jangan hitung ulang dari so.items sebagai
          // sumber utama, karena rapuh (state items bisa saja belum/tidak
          // sinkron). getSalesOrderTotal cuma fallback kalau field ini kosong.
          totalHargaPesanan: getNumber(so, ["totalHargaPesanan"]) || getSalesOrderTotal(so),
        }
      : undefined);

  const pengirimanInitialData: Partial<PengirimanFormData> | undefined =
    draft.pengiriman ??
    (so
      ? {
          id: 0,
          customerId: getNumber(so, ["customerId"]) || undefined,
          pelanggan: getString(so, ["pelanggan", "customerName"]),
          noSuratJalan: "",
          noSuratJalanMode: "auto" as const,
          tanggalKirim: getString(so, ["tanggalKirim", "deliveryDate"]) || new Date().toISOString().split("T")[0],
          salesOrderId: salesOrderId || undefined,
          noSo: salesOrderNumber,
          noPO: getString(so, ["noPO", "poNumber"]),
          shippingType: "",
          alamatPengiriman: getString(so, ["alamatPengiriman", "address"]),
          keterangan: getString(so, ["keterangan", "notes"]),
          items: getItems(so).map((item) => ({
            id: crypto.randomUUID(),
            productId: getNumber(item, ["productId"]) || undefined,
            productCode: getString(item, ["productCode"]),
            productName: getString(item, ["productName", "namaBarang"]),
            satuan: getString(item, ["satuan", "unit", "uom"]),
            uomId: getNumber(item, ["uomId"]) || undefined,
            qtyDipesan: getNumber(item, ["qty", "quantity", "productQty"]),
            qtyDikirim: getNumber(item, ["qty", "quantity", "productQty"]),
            warehouseId: getNumber(item, ["warehouseId"]) || undefined,
            warehouseName: getString(item, ["warehouseName"]),
          })),
        }
      : undefined);

  const fakturInitialData: Partial<FakturPenjualanFormData> | undefined =
    draft.faktur ??
    (pengiriman
      ? {
          customerId: getNumber(pengiriman, ["customerId"]) || undefined,
          pelanggan: getString(pengiriman, ["pelanggan", "customerName"]),
          salesOrderId: getNumber(pengiriman, ["salesOrderId"]) || salesOrderId || undefined,
          noSo: getString(pengiriman, ["noSo"]) || salesOrderNumber,
          deliveryOrderId: getNumber(pengiriman, ["id"]) || undefined,
          noPengiriman: getString(pengiriman, ["noSuratJalan", "noPengiriman"]),
          noPO: getString(pengiriman, ["noPO"]),
          alamat: getString(pengiriman, ["alamatPengiriman", "address"]),
          keterangan: getString(pengiriman, ["keterangan", "notes"]),
          kenaPajak: getBool(so, ["kenaPajak", "isTaxAble"]),
          items: getItems(pengiriman as DraftSalesOrder).map((item) => {
            const productId = getNumber(item, ["productId"]);
            const soItem = getItems(so).find((source) => getNumber(source, ["productId"]) === productId);
            return {
              id: crypto.randomUUID(),
              productId: productId || undefined,
              productCode: getString(item, ["productCode"]),
              productName: getString(item, ["productName", "namaBarang"]),
              uomId: getNumber(item, ["uomId"]) || undefined,
              satuan: getString(item, ["satuan", "uomCode", "uom"]),
              qty: getNumber(item, ["qtyDikirim", "qty", "quantity", "productQty"]),
              harga: getNumber(soItem, ["harga", "price", "productPrice"]),
              diskon: getNumber(soItem, ["diskon", "discountPercent", "productDiscount"]),
            };
          }),
        }
      : so
      ? {
          customerId: getNumber(so, ["customerId"]) || undefined,
          pelanggan: getString(so, ["pelanggan", "customerName"]),
          salesOrderId: salesOrderId || undefined,
          noSo: salesOrderNumber,
          noPO: getString(so, ["noPO", "poNumber"]),
          alamat: getString(so, ["alamatPengiriman", "address"]),
          keterangan: getString(so, ["keterangan", "notes"]),
          kenaPajak: getBool(so, ["kenaPajak", "isTaxAble"]),
          items: getItems(so).map((item) => ({
            id: crypto.randomUUID(),
            productId: getNumber(item, ["productId"]) || undefined,
            productCode: getString(item, ["productCode"]),
            productName: getString(item, ["productName", "namaBarang"]),
            uomId: getNumber(item, ["uomId"]) || undefined,
            satuan: getString(item, ["satuan", "uomCode", "uom"]),
            qty: getNumber(item, ["qty", "quantity", "productQty"]),
            harga: getNumber(item, ["harga", "price", "productPrice"]),
            diskon: getNumber(item, ["diskon", "discountPercent", "productDiscount"]),
          })),
        }
      : undefined);

  const penerimaanInitialData: Partial<PenerimaanFormData> | undefined =
    draft.penerimaan ??
    (faktur
      ? {
          customerId: getNumber(faktur, ["customerId"]) || undefined,
          pelanggan: getString(faktur, ["pelanggan", "customerName"]),
          bank: "",
          nilaiPembayaran: getNumber(faktur, ["remainingAmount"]) || 0,
          tanggalBayar: new Date().toISOString().split("T")[0],
          noBukti: "",
          noBuktiMode: "auto" as const,
          keterangan: `Pembayaran faktur ${getString(faktur, ["noFaktur"])}`,
          salesInvoiceId: getNumber(faktur, ["id"]) || undefined,
          salesOrderId: getNumber(faktur, ["salesOrderId"]) || salesOrderId || undefined,
        }
      : uangMuka
      ? {
          customerId: getNumber(uangMuka, ["customerId"]) || undefined,
          pelanggan: getString(uangMuka, ["pelanggan", "customerName"]),
          bank: "",
          nilaiPembayaran: getNumber(uangMuka, ["uangMuka", "nominalUangMuka", "totalAmount"]),
          tanggalBayar: new Date().toISOString().split("T")[0],
          noBukti: "",
          noBuktiMode: "auto" as const,
          keterangan: `Pembayaran uang muka ${getString(uangMuka, ["noFaktur"])}`,
          uangMukaId: getNumber(uangMuka, ["id"]) || undefined,
          salesOrderId: getNumber(uangMuka, ["salesOrderId"]) || salesOrderId || undefined,
        }
      : so
      ? {
          customerId: getNumber(so, ["customerId"]) || undefined,
          pelanggan: getString(so, ["pelanggan", "customerName"]),
          bank: "",
          nilaiPembayaran: getSalesOrderTotal(so),
          tanggalBayar: new Date().toISOString().split("T")[0],
          noBukti: "",
          noBuktiMode: "auto" as const,
          keterangan: `Pembayaran dari Sales Order ${salesOrderNumber}`,
          salesOrderId: salesOrderId || undefined,
        }
      : undefined);

  return (
    <>
      <SalesOrderModal
        open={activeModal === "salesOrder"}
        onClose={closeModal}
        onSubmit={() => {}}
        onNavigate={handleSONavigate}
        initialData={draft.salesOrder}
      />

      <UangMukaModal
        open={activeModal === "uangMuka"}
        onClose={closeModal}
        onSubmit={handleUMSubmit}
        initialData={uangMukaInitialData}
        isSaved={isSaved("uangMuka")}
        onProses={handleUMProses}
      />

      <PengirimanModal
        open={activeModal === "pengiriman"}
        onClose={closeModal}
        onSubmit={handlePengirimanSubmit}
        onProses={handlePengirimanProses}
        initialData={pengirimanInitialData}
      />

      <FakturPenjualanModal
        open={activeModal === "faktur"}
        onClose={closeModal}
        onSubmit={handleFakturSubmit}
        onProses={handleFakturProses}
        initialData={fakturInitialData}
      />

      <PenerimaanModal
        open={activeModal === "penerimaan"}
        onClose={closeModal}
        onSubmit={handlePenerimaanSubmit}
        initialData={penerimaanInitialData}
      />
    </>
  );
}


