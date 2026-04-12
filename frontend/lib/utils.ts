import { Person, ReceiptItem } from "./types";

export const PERSON_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function withNextPersonColor(index: number): string {
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

export function computePersonSubtotal(person: Person, items: ReceiptItem[]): number {
  return items
    .filter((i) => (i.category === "item" || i.category === "discount") && i.assignees.includes(person.id))
    .reduce((acc, item) => acc + item.total / item.assignees.length, 0);
}

export function computeUnassignedTotal(items: ReceiptItem[]): number {
  return items
    .filter((i) => (i.category === "item" || i.category === "discount") && i.assignees.length === 0)
    .reduce((acc, i) => acc + i.total, 0);
}
