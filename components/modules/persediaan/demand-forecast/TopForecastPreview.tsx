"use client";

import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";

import type { InventoryAiSummary } from "@/lib/services/inventory-dashboard.service";

interface TopForecastPreviewProps {
  aiSummary: InventoryAiSummary;
}

export function TopForecastPreview({
  aiSummary,
}: TopForecastPreviewProps) {
  return (
    <section className="mt-6">

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <Trophy size={18} />
              </div>

              <h2 className="text-lg font-semibold text-slate-900">
                Top Demand Forecast
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              Products with the highest predicted demand for the upcoming
              period.
            </p>
          </div>

          <Link
            href="/inventory/demand-forecast"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 transition hover:text-amber-700"
          >
            View All
            <ArrowRight size={16} />
          </Link>

        </div>

        <div className="divide-y divide-slate-100">

          {aiSummary.topForecastProducts.map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50"
            >

              <div className="flex items-center gap-4">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                  #{index + 1}
                </div>

                <div>
                  <p className="font-medium text-slate-900">
                    {product.productName}
                  </p>

                  <p className="text-sm text-slate-500">
                    Product ID #{product.productId}
                  </p>
                </div>

              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {product.forecast.toFixed(2)}
                </p>

                <p className="text-sm text-slate-500">
                  Units
                </p>
              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}