export default function SeverityBadge({
  severity,
}: {
  severity: "low" | "medium" | "high" | "critical";
}) {
  const styles: Record<string, string> = {
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-800",
    high: "border-orange-200 bg-orange-50 text-orange-800",
    critical: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold capitalize leading-none ${
        styles[severity] || styles.medium
      }`}
    >
      {severity}
    </span>
  );
}
