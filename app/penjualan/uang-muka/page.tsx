"use client";

import { Suspense } from "react";
import UangMukaContent from "./UangMukaContent";

export default function UangMukaPage() {
  return (
    <Suspense fallback={null}>
      <UangMukaContent />
    </Suspense>
  );
}