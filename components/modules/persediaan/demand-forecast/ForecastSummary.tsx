interface Props {
  totalProducts: number;
  totalForecast: number;
  needReorder: number;
  needRestock: number;
}

export default function ForecastSummary({
  totalProducts,
  totalForecast,
  needReorder,
  needRestock,
}: Props) {
  const cards = [
    {
      title: "Products",
      value: totalProducts,
    },
    {
      title: "Forecast Qty",
      value: totalForecast,
    },
    {
      title: "Need Reorder",
      value: needReorder,
    },
    {
      title: "Need Restock",
      value: needRestock,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-slate-500">
            {card.title}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-800">
            {card.value}
          </h2>
        </div>
      ))}
    </div>
  );
}