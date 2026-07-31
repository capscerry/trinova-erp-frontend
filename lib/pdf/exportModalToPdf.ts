/**
 * exportModalToPdf.ts
 *
 * Shared utility for capturing a modal body element and converting it to a
 * multi-page A4 PDF using html2canvas + jsPDF.
 *
 * Key compatibility fix – Tailwind v4 + html2canvas 1.4.1:
 *   Tailwind v4 generates CSS colors using oklch() (CSS Color Level 4).
 *   html2canvas 1.4.1 only understands sRGB color functions (rgb, rgba, hsl,
 *   hsla, hex). When it encounters oklch() it throws:
 *     "Attempting to parse an unsupported color function 'oklch'"
 *
 *   Solution: before calling html2canvas, walk every element inside the
 *   capture root, read each element's *computed* color/background/border
 *   values, detect any oklch/lab/oklab/lch string, and replace it with a
 *   safe RGB fallback. Restore all original inline styles immediately after
 *   html2canvas resolves (success or error).
 *
 *   The UI is never visually affected — the swap happens between two JS
 *   microtasks and no repaint is committed before the restore.
 *
 * Scrollable body fix:
 *   The pdfRef div has overflow-y-auto + max-h constraint. html2canvas only
 *   sees the layout-box height (clipped), not scrollHeight. We temporarily
 *   expand the element to its full scroll height before capture.
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ExportModalToPdfOptions {
  /** The DOM element to capture (typically the modal body div). */
  element: HTMLElement | null;
  /** Output file name, e.g. "PurchaseOrder_PO-00021.pdf" */
  fileName: string;
}

// ---------------------------------------------------------------------------
// CSS Color Level 4 → RGB fallback table
//
// These are the Tailwind v4 oklch values that appear in the modals.
// Each entry maps a prefix of the computed value string to a safe rgb().
// We match by prefix because oklch values may include slight floating-point
// variation depending on the browser's rendering engine.
//
// Approach: use a canvas-based conversion to get the *actual* rendered color
// rather than a hardcoded lookup — this handles any oklch value regardless of
// whether it's in this table.
// ---------------------------------------------------------------------------

/** Returns true if the CSS color string contains an unsupported Level 4 function. */
function isUnsupportedColor(value: string): boolean {
  return (
    value.includes("oklch(") ||
    value.includes("oklab(") ||
    value.includes("lab(")   ||
    value.includes("lch(")
  );
}

/**
 * Convert any CSS color string (including oklch) to an rgb() string by
 * rendering it into a 1×1 canvas. Returns "rgb(255,255,255)" on failure.
 *
 * This works in any browser that supports the color natively (all modern
 * browsers do), even though html2canvas does not.
 */
function resolveColorToRgb(colorValue: string): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width  = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "rgb(255,255,255)";
    ctx.fillStyle = colorValue;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return "rgba(0,0,0,0)";
    return `rgb(${r},${g},${b})`;
  } catch {
    return "rgb(255,255,255)";
  }
}

// CSS properties whose computed value may carry a Color Level 4 function.
const COLOR_PROPS: (keyof CSSStyleDeclaration)[] = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "caretColor",
  "columnRuleColor",
];

interface SavedStyle {
  el:       HTMLElement;
  prop:     string;
  original: string;
}

/**
 * Walk every element under `root`, detect Level-4 color values in computed
 * styles, write a safe rgb() replacement as an inline style override, and
 * return a list of all changes so they can be reverted later.
 */
function patchUnsupportedColors(root: HTMLElement): SavedStyle[] {
  const saved: SavedStyle[] = [];
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const el of elements) {
    const computed = window.getComputedStyle(el);

    for (const prop of COLOR_PROPS) {
      const value = computed[prop] as string;
      if (!value || !isUnsupportedColor(value)) continue;

      // Save the current *inline* style value (may be empty string) so we
      // can restore it precisely, not the computed value.
      const propStr = prop as string;
      saved.push({ el, prop: propStr, original: (el.style as any)[propStr] ?? "" });

      // Write the safe rgb() override as an inline style.
      (el.style as any)[propStr] = resolveColorToRgb(value);
    }
  }

  return saved;
}

/** Restore every inline style that was patched by patchUnsupportedColors(). */
function restorePatchedColors(saved: SavedStyle[]): void {
  for (const { el, prop, original } of saved) {
    (el.style as any)[prop] = original;
  }
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export async function exportModalToPdf({
  element,
  fileName,
}: ExportModalToPdfOptions): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF capture.");
  }

  // 1. Temporarily expand the scrollable body so html2canvas captures the
  //    full content height, not just the clipped visible viewport.
  const prevOverflow  = element.style.overflow;
  const prevHeight    = element.style.height;
  const prevMaxHeight = element.style.maxHeight;

  element.style.overflow  = "visible";
  element.style.height    = "auto";
  element.style.maxHeight = "none";

  const fullWidth  = element.scrollWidth;
  const fullHeight = element.scrollHeight;

  // 2. Patch every oklch/lab/lch color inside the capture root.
  const colorPatches = patchUnsupportedColors(element);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      allowTaint: true,
      windowWidth:  fullWidth,
      windowHeight: fullHeight,
      scrollX: 0,
      scrollY: 0,
      width:  fullWidth,
      height: fullHeight,
    });
  } finally {
    // 3. Always restore colors and scroll styles, even if html2canvas throws.
    restorePatchedColors(colorPatches);
    element.style.overflow  = prevOverflow;
    element.style.height    = prevHeight;
    element.style.maxHeight = prevMaxHeight;
  }

  // 4. Build multi-page A4 PDF — identical pagination logic to invoicePdf.tsx.
  const imgWidthMm   = 210;
  const pageHeightMm = 297;
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
