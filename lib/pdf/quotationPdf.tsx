import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QuotationPrintDocument } from "@/components/modules/penjualan/QuotationPrintDocument";
import type { SalesQuotationDetail } from "@/lib/services/penjualan.service";

export interface GeneratedQuotationPdf {
  blob: Blob;
  base64: string;
  fileName: string;
}

/**
 * Render QuotationPrintDocument di luar layar (off-screen), tangkap jadi
 * canvas lewat html2canvas, lalu susun jadi PDF multi-halaman A4 dengan
 * jsPDF. Hasilnya dipakai sebagai lampiran email "Kirim Penawaran" — supaya
 * isinya PERSIS sama dengan halaman "Cetak / PDF" yang sudah ada, karena
 * keduanya me-render komponen yang sama.
 */
export async function generateQuotationPdf(
  data: SalesQuotationDetail
): Promise<GeneratedQuotationPdf> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(<QuotationPrintDocument data={data} />);
    });

    // Logo perusahaan (img) dimuat secara async — tunggu sampai selesai
    // (atau timeout 2 detik sebagai fallback) supaya tidak ikut ter-capture
    // dalam keadaan blank/broken.
    const img = container.querySelector("img");
    if (img && !img.complete) {
      await new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
        setTimeout(() => resolve(), 2000);
      });
    }

    const pageEl = container.querySelector(".qpd-page") as HTMLElement | null;
    if (!pageEl) {
      throw new Error("Gagal menyiapkan dokumen penawaran untuk PDF.");
    }

    // scale 1.5 (bukan 2) -- render+encode jauh lebih cepat, hasil cetak
    // tetap tajam untuk dokumen bisnis. Lihat catatan sama di invoicePdf.tsx.
    const canvas = await html2canvas(pageEl, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // Susun canvas (satu gambar utuh) menjadi PDF A4, dipotong per halaman
    // kalau kontennya lebih panjang dari satu halaman (banyak item produk).
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

    const fileName = `Penawaran-${data.nomor || "quotation"}.pdf`;
    const blob = pdf.output("blob");
    const dataUri = pdf.output("datauristring");
    const base64 = dataUri.split(",")[1] ?? "";

    return { blob, base64, fileName };
  } finally {
    root.unmount();
    container.remove();
  }
}
