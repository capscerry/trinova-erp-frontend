"use client";

import { Suspense } from "react";
import PurchaseDownPaymentContent from "./PurchaseDownPaymentContent";

export default function PurchaseDownPaymentPage() {
  return (
    <Suspense fallback={null}>
      <PurchaseDownPaymentContent />
    </Suspense>
  );
}