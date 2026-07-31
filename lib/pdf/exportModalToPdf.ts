/**
 * exportModalToPdf.ts
 *
 * Shared utility for capturing a modal body element and converting it to a
 * multi-page A4 PDF using html2canvas + jsPDF.
 *
 * This follows the exact same approach already used in:
 *   lib/pdf/invoicePdf.tsx
 *   lib/pdf/quotationPdf.tsx
 *   lib/pdf/purchaseOrderPdf.tsx
 *
 * Usage:
 *   import { exportModalToPdf } from "@/lib/pdf/exportModalToPdf";
 *
 *   const pdfRef = useRef<HTMLDivElement>(null);
 *
 *   await exportModalToPdf({
 *     element: pdfRef.current,
 *     fileName: "PurchaseOrder_PO-00021.pdf",
 *   });
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ExportModalToPdfOptions {
  /** The DOM element to capture (typically the modal body div). */
  element: HTMLElement | null;
  /** Output file name, e.g. "PurchaseOrder_PO-00021.pdf" */
  fileName: string;
}

/**
 * Captures `element` with html2canvas and writes a multi-page A4 PDF that
 * automatically paginates if the content is taller than one page.
 *
 * Settings kept identical to invoicePdf.tsx / purchaseOrderPdf.tsx:
 *   scale: 1.5, useCORS: true, backgroundColor: "#ffffff"
 *   jsPDF: portrait, mm, a4
 */
export async function exportModalToPdf({
  element,
  fileName,
}: ExportModalToPdfOptions): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF capture.");
  }

  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    allowTaint: true,
  });

  const imgWidthMm   = 210;           // A4 width in mm
  const pageHeightMm = 297;           // A4 height in mm
  const imgHeightMm  = (canvas.height * imgWidthMm) / canvas.width;

  const pdf     = new jsPDF("p", "mm", "a4");
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeightMm;
  let position   = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
  heightLeft -= pageHeightMm;

  while (heightLeft > 0) {
    position = heightLeft - imgHeightMm;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeightMm;
  }

  pdf.save(fileName);
}
