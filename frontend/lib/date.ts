function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getIsoDateKey(input: string): string {
  const m = input.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function getIsoDateParts(input: string): { year: number; month: number; day: number } | null {
  const key = getIsoDateKey(input);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return { year: y, month: m, day: d };
}

export function formatIsoDateLabel(input: string): string {
  const key = getIsoDateKey(input);
  if (!key) return "Unknown date";
  const [y, m, d] = key.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return utcDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
