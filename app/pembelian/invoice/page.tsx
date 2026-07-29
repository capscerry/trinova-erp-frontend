"use client";

import { Suspense } from "react";
import PurchaseInvoiceContent from "./PurchaseInvoiceContent";

export default function PurchaseInvoicePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseInvoiceContent />
    </Suspense>
  );
}