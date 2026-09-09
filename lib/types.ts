export const categories = [
  "Maintenance",
  "Payment",
  "General",
  "Urgent",
] as const;
export const sources = ["SMS", "Email", "WhatsApp", "Other"] as const;
export type Category = (typeof categories)[number];
export type Source = (typeof sources)[number];
export type Status = "Open" | "Resolved";
export interface Property {
  id: string;
  name: string;
  address: string;
}
export interface Tenant {
  id: string;
  name: string;
  email: string;
  property_id: string;
}
export interface Message {
  direction?: "incoming" | "outgoing";
  reply_to?: string | null;
  id: string;
  tenant_id: string;
  property_id: string;
  source: Source;
  content: string;
  category: Category;
  status: Status;
  created_at: string;
}
export interface Rule {
  id: string;
  keyword: string;
  category: Category;
}
export interface InboxData {
  properties: Property[];
  tenants: Tenant[];
  messages: Message[];
  rules: Rule[];
}
