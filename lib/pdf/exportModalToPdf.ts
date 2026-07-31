/**
 * exportModalToPdf.ts
 *
 * Shared utility for capturing a modal body element and converting it to a
 * multi-page A4 PDF using html2canvas + jsPDF.
 *
 * Root-cause fix (scrollable modal body):
 *   The pdfRef is attached to a div with `overflow-y-auto` and a constrained
 *   `max-height`. html2canvas only captures the *layout box* of the element,
 *   not its scroll content — so it would produce a blank or clipped result.
 *
 *   Solution: temporarily override `overflow`, `height`, and `maxHeight` to
 *   let the element expand to its full scroll height before capture, then
 *   restore the original values immediately after. The user never sees this
 *   because it happens synchronously before the next paint is committed.
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
 * Settings identical to invoicePdf.tsx / purchaseOrderPdf.tsx:
 *   scale: 2, useCORS: true, backgroundColor: "#ffffff"
 *   jsPDF: portrait, mm, a4
 */
export async function exportModalToPdf({
  element,
  fileName,
}: ExportModalToPdfOptions): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF capture.");
  }

  // ------------------------------------------------------------------
  // 1. Temporarily remove scroll constraints so html2canvas sees the
  //    full content height, not just the visible viewport of the div.
  // ------------------------------------------------------------------
  const prevOverflow  = element.style.overflow;
  const prevHeight    = element.style.height;
  const prevMaxHeight = element.style.maxHeight;

  element.style.overflow  = "visible";
  element.style.height    = "auto";
  element.style.maxHeight = "none";

  // Capture full scroll dimensions *after* style override
  const fullWidth  = element.scrollWidth;
  const fullHeight = element.scrollHeight;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      allowTaint: true,
      // Tell html2canvas the viewport size matches the full content so
      // it doesn't clip or rescale based on the window dimensions.
      windowWidth:  fullWidth,
      windowHeight: fullHeight,
      scrollX: 0,
      scrollY: 0,
      width:  fullWidth,
      height: fullHeight,
    });
  } finally {
    // ------------------------------------------------------------------
    // 2. Always restore original styles, even if html2canvas throws.
    // ------------------------------------------------------------------
    element.style.overflow  = prevOverflow;
    element.style.height    = prevHeight;
    element.style.maxHeight = prevMaxHeight;
  }

  // ------------------------------------------------------------------
  // 3. Build multi-page A4 PDF (identical to invoicePdf.tsx logic).
  // ------------------------------------------------------------------
  const imgWidthMm   = 210;   // A4 width in mm
  const pageHeightMm = 297;   // A4 height in mm
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
