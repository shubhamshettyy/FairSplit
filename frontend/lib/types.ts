export type ItemCategory = "item" | "tax" | "fee" | "tip" | "discount";
export type ChargeSplitMode = "equal" | "prorated";

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  category: ItemCategory;
  assignees: string[];
}

export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface SplitSession {
  session_id: string;
  created_at: string;
  name: string;
  items: ReceiptItem[];
  people: Person[];
  charge_split_mode: ChargeSplitMode;
}

export interface PersonSummary {
  person_id: string;
  name: string;
  color: string;
  subtotal: number;
  tax_and_fees_share: number;
  total_owed: number;
  items: ReceiptItem[];
}

export interface SummaryResponse {
  people: PersonSummary[];
  grand_total: number;
  unassigned_total: number;
}

export interface ParseReceiptResponse {
  session_id: string;
  items: ReceiptItem[];
}
