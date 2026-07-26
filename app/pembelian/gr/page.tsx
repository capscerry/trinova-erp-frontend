"use client";

import { Suspense } from "react";
import GoodsReceiptContent from "./GoodsReceiptContent";

export default function GoodsReceiptPage() {
  return (
    <Suspense fallback={null}>
      <GoodsReceiptContent />
    </Suspense>
  );
}