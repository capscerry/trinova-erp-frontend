import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PurchaseOrderPrintDocument } from "@/components/modules/pembelian/PurchaseOrderPrintDocument";
import type { PurchaseOrderPrintDetail } from "@/lib/services/purchase-order-print.service";

export interface GeneratedPurchaseOrderPdf {
  blob: Blob;
  base64: string;
  fileName: string;
}

/**
 * Render PurchaseOrderPrintDocument di luar layar (off-screen), tangkap
 * jadi canvas lewat html2canvas, lalu susun jadi PDF multi-halaman A4
 * dengan jsPDF. Dipakai sebagai lampiran email "Kirim Email" PO — isinya
 * PERSIS sama dengan halaman "Print / Save PDF" yang sudah ada. Pola
 * identik dengan lib/pdf/quotationPdf.tsx dan lib/pdf/invoicePdf.tsx
 * di modul Sales.
 */
export async function generatePurchaseOrderPdf(
  data: PurchaseOrderPrintDetail
): Promise<GeneratedPurchaseOrderPdf> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(<PurchaseOrderPrintDocument data={data} />);
    });

    const img = container.querySelector("img");
    if (img && !img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
        setTimeout(() => resolve(), 2000);
      });
    }

    const pageEl = container.querySelector(".pop-page") as HTMLElement | null;
    if (!pageEl) {
      throw new Error("Gagal menyiapkan dokumen Purchase Order untuk PDF.");
    }

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgWidthMm = 210;
    const pageHeightMm = 297;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;

    while (heightLeft > 0) {
      position = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeightMm;
    }

    const fileName = `PO-${data.header.po_number || "purchase-order"}.pdf`;
    const blob = pdf.output("blob");
    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.split(",")[1] ?? "";

    return { blob, base64, fileName };
  } finally {
    root.unmount();
    container.remove();
  }
}
