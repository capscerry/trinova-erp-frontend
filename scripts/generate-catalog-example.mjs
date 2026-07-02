/**
 * generate-catalog-example.mjs
 *
 * Generates an example supplier catalog Excel file that will pass
 * the Upload Catalog validation:
 *   - No duplicate product_id rows
 *   - All product_ids exist in master_product (any supplier can catalog any product)
 *
 * Product IDs are taken from the master_product table screenshot (product_ids visible):
 *   2, 27, 28, 31, 56, 57, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
 *   70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88
 *
 * Column names must match what parseCatalogFile() reads:
 *   product_id | supplier_price | available_ | lead_time_days
 *
 * Run:
 *   node scripts/generate-catalog-example.mjs
 *
 * Output:
 *   public/catalog-example-supplier1.xlsx
 */

import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../public");
const outFile = path.join(outDir, "catalog-example-supplier1.xlsx");

// ── Rows — all unique product_ids that belong to supplier_id = 1 ────────────────
// Values are realistic sample data; adjust to match your actual pricing.
const rows = [
  { product_id:  2,  supplier_price: 185000,  available_: 50,  lead_time_days: 7  },
  { product_id: 27,  supplier_price: 320000,  available_: 30,  lead_time_days: 10 },
  { product_id: 28,  supplier_price:  95000,  available_: 80,  lead_time_days: 5  },
  { product_id: 31,  supplier_price:  42000,  available_: 200, lead_time_days: 3  },
  { product_id: 56,  supplier_price: 150000,  available_: 40,  lead_time_days: 7  },
  { product_id: 57,  supplier_price: 500000,  available_: 15,  lead_time_days: 14 },
  { product_id: 59,  supplier_price: 275000,  available_: 25,  lead_time_days: 10 },
  { product_id: 60,  supplier_price: 135000,  available_: 60,  lead_time_days: 7  },
  { product_id: 61,  supplier_price: 130000,  available_: 60,  lead_time_days: 7  },
  { product_id: 62,  supplier_price: 128000,  available_: 55,  lead_time_days: 7  },
  { product_id: 63,  supplier_price: 126000,  available_: 55,  lead_time_days: 7  },
  { product_id: 64,  supplier_price: 122000,  available_: 50,  lead_time_days: 7  },
  { product_id: 65,  supplier_price: 120000,  available_: 45,  lead_time_days: 7  },
  { product_id: 66,  supplier_price: 210000,  available_: 35,  lead_time_days: 10 },
  { product_id: 67,  supplier_price: 195000,  available_: 30,  lead_time_days: 10 },
  { product_id: 68,  supplier_price: 175000,  available_: 40,  lead_time_days: 10 },
  { product_id: 69,  supplier_price: 410000,  available_: 20,  lead_time_days: 14 },
  { product_id: 70,  supplier_price: 380000,  available_: 18,  lead_time_days: 14 },
  { product_id: 71,  supplier_price: 290000,  available_: 22,  lead_time_days: 12 },
  { product_id: 72,  supplier_price: 340000,  available_: 20,  lead_time_days: 12 },
  { product_id: 73,  supplier_price:  88000,  available_: 75,  lead_time_days: 5  },
  { product_id: 74,  supplier_price: 220000,  available_: 28,  lead_time_days: 10 },
  { product_id: 75,  supplier_price: 215000,  available_: 28,  lead_time_days: 10 },
  { product_id: 76,  supplier_price: 198000,  available_: 32,  lead_time_days: 10 },
  { product_id: 77,  supplier_price: 450000,  available_: 12,  lead_time_days: 14 },
  { product_id: 78,  supplier_price:  65000,  available_: 100, lead_time_days: 5  },
  { product_id: 79,  supplier_price:  72000,  available_: 90,  lead_time_days: 5  },
  { product_id: 80,  supplier_price:  78000,  available_: 85,  lead_time_days: 5  },
  { product_id: 81,  supplier_price: 160000,  available_: 45,  lead_time_days: 7  },
  { product_id: 82,  supplier_price: 520000,  available_: 10,  lead_time_days: 21 },
  { product_id: 83,  supplier_price: 390000,  available_: 15,  lead_time_days: 14 },
  { product_id: 84,  supplier_price:  55000,  available_: 120, lead_time_days: 3  },
  { product_id: 85,  supplier_price:  68000,  available_: 95,  lead_time_days: 5  },
  { product_id: 86,  supplier_price: 310000,  available_: 20,  lead_time_days: 10 },
  { product_id: 87,  supplier_price: 145000,  available_: 50,  lead_time_days: 7  },
  { product_id: 88,  supplier_price: 230000,  available_: 25,  lead_time_days: 10 },
];

// ── Build workbook ─────────────────────────────────────────────────────────────
const ws = XLSX.utils.json_to_sheet(rows, {
  header: ["product_id", "supplier_price", "available_", "lead_time_days"],
});

// Column widths for readability
ws["!cols"] = [
  { wch: 12 }, // product_id
  { wch: 16 }, // supplier_price
  { wch: 13 }, // available_
  { wch: 16 }, // lead_time_days
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Catalog");

// ── Write file ─────────────────────────────────────────────────────────────────
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
XLSX.writeFile(wb, outFile);

console.log(`✅  Created: ${outFile}`);
console.log(`   Rows   : ${rows.length} products (supplier_id = 1, no duplicates)`);
console.log(`   Columns: product_id | supplier_price | available_ | lead_time_days`);
