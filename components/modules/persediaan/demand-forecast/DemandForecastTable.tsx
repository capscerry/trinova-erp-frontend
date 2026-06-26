"use client";

import { DataTable }
  from "@/components/ui/DataTable";

import { columns }
  from "@/app/persediaan/demand-forecast/columns";

import { Forecast } from "@/types/forecast.type";

interface Props {
  data: Forecast[];
  loading: boolean;
}

export default function DemandForecastTable({
  data,
  loading,
}: Props) {
  return (
    <DataTable
      title="AI Demand Forecast"
      columns={columns}
      data={data}
      loading={loading}
      keyField="product_id"
    />
  );
}