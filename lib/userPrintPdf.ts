// lib/usePrintPdf.ts

export function printAsPdf(elementId: string, filename?: string) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`Element #${elementId} tidak ditemukan`);
    return;
  }

  // Set judul dokumen sebagai nama file PDF di dialog print
  const originalTitle = document.title;
  if (filename) document.title = filename;

  // Tambahkan class print-target sementara
  el.classList.add("print-target");
  document.body.classList.add("printing");

  window.print();

  // Kembalikan seperti semula setelah print
  el.classList.remove("print-target");
  document.body.classList.remove("printing");
  document.title = originalTitle;
}