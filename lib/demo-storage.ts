import type { InboxData } from "./types.ts";

export const storageKey = "haven-inbox-v1";
let memory: InboxData | undefined;
let warning = "";

function isInboxData(value: unknown): value is InboxData {
  if (!value || typeof value !== "object") return false;
  const data = value as InboxData;
  return (
    Array.isArray(data.properties) &&
    data.properties.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.address === "string",
    ) &&
    Array.isArray(data.tenants) &&
    data.tenants.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        typeof t.email === "string" &&
        data.properties.some((p) => p.id === t.property_id),
    ) &&
    Array.isArray(data.messages) &&
    data.messages.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.content === "string" &&
        ["SMS", "Email", "WhatsApp", "Other"].includes(m.source) &&
        ["Maintenance", "Payment", "General", "Urgent"].includes(m.category) &&
        ["Open", "Resolved"].includes(m.status) &&
        typeof m.created_at === "string" &&
        !Number.isNaN(Date.parse(m.created_at)) &&
        data.tenants.some(
          (t) => t.id === m.tenant_id && t.property_id === m.property_id,
        ),
    ) &&
    Array.isArray(data.rules) &&
    data.rules.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.keyword === "string" &&
        ["Maintenance", "Payment", "General", "Urgent"].includes(r.category),
    )
  );
}

export function readDemoData(seed: InboxData): InboxData {
  if (memory) return structuredClone(memory);
  let saved: string | null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    warning =
      "Browser storage is unavailable. Changes work in this tab but will be lost when you reload.";
    memory = structuredClone(seed);
    return structuredClone(memory);
  }
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (!isInboxData(parsed)) throw new Error("Invalid workspace");
      memory = parsed;
    } catch {
      // Keep the original entry intact until a subsequent successful write.
      warning =
        "Saved demo data could not be loaded. Examples are available in this tab; the next change will replace the unreadable demo data.";
    }
  }
  memory ??= structuredClone(seed);
  return structuredClone(memory);
}

export function writeDemoData(data: InboxData): void {
  memory = structuredClone(data);
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    warning = "";
  } catch {
    warning =
      "Browser storage is unavailable. Changes work in this tab but will be lost when you reload.";
  }
}

export function storageWarning(): string {
  return warning;
}

/** getRandomValues also works on HTTP previews where randomUUID is unavailable. */
export function newDemoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
