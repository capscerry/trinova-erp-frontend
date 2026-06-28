interface Props {
  recommendation: string;
}

export default function RecommendationBadge({
  recommendation,
}: Props) {
  let className =
    "rounded-full px-3 py-1 text-xs font-medium";

  switch (recommendation) {
    case "Stock Aman":
      className +=
        " bg-green-100 text-green-700";
      break;

    case "Perlu Reorder":
      className +=
        " bg-yellow-100 text-yellow-700";
      break;

    case "Segera Restock":
      className +=
        " bg-red-100 text-red-700";
      break;

    default:
      className +=
        " bg-slate-100 text-slate-700";
      break;
  }

  return (
    <span className={className}>
      {recommendation}
    </span>
  );
}