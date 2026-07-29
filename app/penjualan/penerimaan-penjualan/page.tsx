"use client";

import { Suspense } from "react";
import PenerimaanPenjualanContent from "./PenerimaanPenjualanContent";

export default function PenerimaanPenjualanPage() {
  return (
    <Suspense fallback={null}>
      <PenerimaanPenjualanContent />
    </Suspense>
  );
}