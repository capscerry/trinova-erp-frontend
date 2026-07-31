/**
 * purchasePrintStyles.ts
 *
 * Shared CSS for all Purchasing print pages.
 * All selectors use the "pp-" prefix (Purchase Print) to avoid any
 * collision with the app's Tailwind classes.
 *
 * Inject via:
 *   <style>{PURCHASE_PRINT_CSS}</style>
 *
 * Pattern matches the existing Sales print pages and PurchaseOrderPrintDocument.
 */

export const PURCHASE_PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    background: #edf1f5;
    color: #172033;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Screen helpers ─────────────────────────── */
  .pp-screen-state {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    font-size: 14px;
  }
  .pp-screen-state.error { color: #dc2626; }

  /* ── Fixed toolbar (hidden on print) ───────── */
  .pp-toolbar {
    position: fixed;
    right: 18px;
    top: 18px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pp-toolbar button {
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 700;
    padding: 9px 18px;
  }
  .pp-btn-print { background: #0d1b2a; color: #e8d08a; }
  .pp-btn-close  { background: #ffffff; color: #334155; border: 1px solid #dbe3ea !important; }

  /* ── A4 page ────────────────────────────────── */
  .pp-page {
    width: 210mm;
    min-height: 297mm;
    margin: 18px auto;
    background: #fff;
    padding: 13mm 14mm;
    box-shadow: 0 24px 70px rgba(15, 23, 42, .15);
  }

  /* ── Brand header ───────────────────────────── */
  .pp-brand {
    display: grid;
    grid-template-columns: 92px 1fr 200px;
    gap: 18px;
    align-items: start;
    border-bottom: 3px solid #0d1b2a;
    padding-bottom: 16px;
  }
  .pp-brand-logo { width: 82px; height: 82px; object-fit: contain; }
  .pp-company-name {
    color: #0d1b2a;
    font-size: 25px;
    font-weight: 800;
    letter-spacing: 5px;
    line-height: 1;
  }
  .pp-company-sub {
    color: #c9a84c;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
    margin-top: 7px;
    text-transform: uppercase;
  }
  .pp-company-address {
    color: #526273;
    font-size: 10px;
    line-height: 1.6;
    margin-top: 8px;
  }

  /* ── Document type box (top-right) ─────────── */
  .pp-doc-box {
    border: 1px solid #d7e0e8;
    border-radius: 10px;
    padding: 12px;
    text-align: right;
  }
  .pp-doc-title {
    color: #0d1b2a;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .pp-doc-number {
    color: #c9a84c;
    font-size: 12px;
    font-weight: 800;
    margin-top: 6px;
  }
  .pp-doc-status {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-top: 8px;
    padding: 3px 8px;
    border-radius: 99px;
    background: #f0f4f8;
    color: #526273;
    text-transform: uppercase;
  }

  /* ── Two-column info grid ───────────────────── */
  .pp-info-grid {
    display: grid;
    grid-template-columns: 1.15fr .85fr;
    gap: 14px;
    margin-top: 18px;
  }
  .pp-panel {
    border: 1px solid #dbe3ea;
    border-radius: 10px;
    overflow: hidden;
  }
  .pp-panel-title {
    background: #f5f7fa;
    border-bottom: 1px solid #dbe3ea;
    color: #526273;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
    padding: 8px 10px;
    text-transform: uppercase;
  }
  .pp-panel-body { padding: 11px 12px; }
  .pp-entity-name {
    color: #0d1b2a;
    font-size: 14px;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .pp-muted { color: #64748b; line-height: 1.5; }

  /* ── Meta rows (label / value) ──────────────── */
  .pp-meta-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 8px;
    padding: 4px 0;
  }
  .pp-meta-label { color: #64748b; }
  .pp-meta-value { color: #172033; font-weight: 700; text-align: right; }

  /* ── Items table ────────────────────────────── */
  .pp-table {
    border-collapse: collapse;
    margin-top: 18px;
    width: 100%;
  }
  .pp-table thead th {
    background: #0d1b2a;
    color: #fff;
    font-size: 10px;
    letter-spacing: .6px;
    padding: 9px 8px;
    text-align: left;
    text-transform: uppercase;
  }
  .pp-table tbody td {
    border-bottom: 1px solid #e6edf3;
    color: #26384d;
    padding: 9px 8px;
    vertical-align: top;
  }
  .pp-table tfoot td {
    background: #f8fafc;
    border-top: 2px solid #0d1b2a;
    color: #172033;
    font-weight: 800;
    padding: 9px 8px;
  }
  .pp-sub-text { color: #94a3b8; font-size: 10px; margin-top: 3px; }
  .pp-right { text-align: right; }
  .pp-center { text-align: center; }

  /* ── Bottom grid (note + summary) ──────────── */
  .pp-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 16px;
    margin-top: 18px;
  }
  .pp-note {
    background: #f8fafc;
    border: 1px solid #dbe3ea;
    border-radius: 10px;
    color: #334155;
    line-height: 1.6;
    padding: 12px;
  }
  .pp-note strong {
    color: #0d1b2a;
    display: block;
    font-size: 10px;
    letter-spacing: 1px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  /* ── Terbilang / amount block ───────────────── */
  .pp-terbilang {
    background: #f8fafc;
    border: 1px solid #dbe3ea;
    border-radius: 10px;
    color: #334155;
    font-style: italic;
    line-height: 1.6;
    padding: 12px;
  }
  .pp-terbilang strong {
    color: #0d1b2a;
    display: block;
    font-size: 10px;
    font-style: normal;
    letter-spacing: 1px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  /* ── Summary box ────────────────────────────── */
  .pp-summary {
    border: 1px solid #dbe3ea;
    border-radius: 10px;
    padding: 10px 12px;
  }
  .pp-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
  }
  .pp-summary-row span:first-child { color: #64748b; }
  .pp-summary-row span:last-child  { color: #172033; font-weight: 700; }
  .pp-grand {
    border-top: 2px solid #0d1b2a;
    margin-top: 6px;
    padding-top: 9px;
  }
  .pp-grand span { color: #0d1b2a !important; font-size: 15px; font-weight: 900 !important; }

  /* ── Big amount banner (for payment / DP) ───── */
  .pp-amount-banner {
    background: #0d1b2a;
    border-radius: 12px;
    color: #e8d08a;
    font-size: 22px;
    font-weight: 900;
    margin-top: 18px;
    padding: 18px;
    text-align: right;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Single full-width panel ────────────────── */
  .pp-full-panel {
    border: 1px solid #dbe3ea;
    border-radius: 10px;
    margin-top: 18px;
    padding: 14px;
  }

  /* ── Signatures ─────────────────────────────── */
  .pp-signatures {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48px;
    margin-top: 36px;
    text-align: center;
  }
  .pp-signatures-2col {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 90px;
    margin-top: 36px;
    text-align: center;
  }
  .pp-signature-label { color: #526273; font-size: 10px; margin-bottom: 2px; }
  .pp-signature-line {
    border-top: 1px solid #0d1b2a;
    color: #526273;
    font-weight: 700;
    margin-top: 58px;
    padding-top: 8px;
    font-size: 10px;
  }

  /* ── Footer ─────────────────────────────────── */
  .pp-footer {
    border-top: 1px solid #dbe3ea;
    color: #94a3b8;
    font-size: 9px;
    margin-top: 26px;
    padding-top: 10px;
    text-align: center;
  }

  /* ── Print overrides ────────────────────────── */
  @page { size: A4 portrait; margin: 0; }
  @media print {
    body { background: #fff !important; }
    .pp-toolbar { display: none !important; }
    .pp-page {
      box-shadow: none !important;
      margin: 0 !important;
      min-height: 297mm;
      width: 210mm;
    }
  }
`;
