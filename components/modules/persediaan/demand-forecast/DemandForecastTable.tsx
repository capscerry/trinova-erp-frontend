"use client";

import { DataTable }
  from "@/components/ui/DataTable";

import { columns }
  from "@/app/persediaan/demand-forecast/columns";

import { DemandForecast }
  from "@/app/persediaan/demand-forecast/types";

interface Props {
  data: DemandForecast[];
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