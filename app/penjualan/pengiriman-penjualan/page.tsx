"use client";

import { Suspense } from "react";
import PengirimanPenjualanContent from "./PengirimanPenjualanContent";

export default function PengirimanPenjualanPage() {
  return (
    <Suspense fallback={null}>
      <PengirimanPenjualanContent />
    </Suspense>
  );
}