import seed from "./seed.json";
import { categorize } from "./rules";
import type { InboxData, Message, Rule, Status } from "./types";
let databaseMode = false;
export function usingDatabase() {
  return databaseMode;
}
export async function demoRequest(
  body?: Record<string, unknown>,
  conversation?: string,
) {
  try {
    const response = await fetch(
      "/api/demo" +
        (conversation
          ? "?conversation=" + encodeURIComponent(conversation)
          : ""),
      {
        method: body ? "POST" : "GET",
        cache: "no-store",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        "The demo workspace could not be loaded or saved. Please try again.",
      );
    return response.json();
  } catch {
    throw new Error(
      "The demo workspace could not be loaded or saved. Please try again.",
    );
  }
}
import { newDemoId, readDemoData, writeDemoData } from "./demo-storage";
export const initialData = seed as InboxData;
export async function loadData(): Promise<InboxData> {
  const result = await demoRequest();
  databaseMode = result.mode === "supabase";
  return databaseMode ? result.data : readDemoData(initialData);
}
export function persist(data: InboxData) {
  if (!databaseMode) writeDemoData(data);
}
export async function createMessage(
  input: Pick<Message, "tenant_id" | "property_id" | "source" | "content">,
  rules: Rule[],
): Promise<Message> {
  if (databaseMode) return demoRequest({ action: "message", ...input });
  return {
    ...input,
    id: newDemoId(),
    category: categorize(input.content, rules),
    status: "Open",
    created_at: new Date().toISOString(),
  };
}
export async function changeStatus(id: string, status: Status) {
  if (databaseMode) await demoRequest({ action: "status", id, status });
}
export async function addRule(
  keyword: string,
  category: Rule["category"],
): Promise<Rule> {
  if (databaseMode) return demoRequest({ action: "rule", keyword, category });
  return { id: newDemoId(), keyword, category };
}
export async function deleteRule(id: string) {
  if (databaseMode) await demoRequest({ action: "deleteRule", id });
}
