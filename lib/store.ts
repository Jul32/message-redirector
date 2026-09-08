import { createClient } from "@supabase/supabase-js";
import seed from "./seed.json";
import { categorize } from "./rules";
import type { InboxData, Message, Rule, Status } from "./types";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key) : null;
import { newDemoId, readDemoData, writeDemoData } from "./demo-storage";
export const initialData = seed as InboxData;
export async function loadData(): Promise<InboxData> {
  if (!supabase) {
    return readDemoData(initialData);
  }
  const tables = ["properties", "tenants", "messages", "rules"] as const;
  const results = await Promise.all(
    tables.map((table) => supabase!.from(table).select("*")),
  );
  for (const result of results) if (result.error) throw result.error;
  return Object.fromEntries(
    tables.map((table, i) => [table, results[i].data]),
  ) as unknown as InboxData;
}
export function persist(data: InboxData) {
  if (!supabase) writeDemoData(data);
}
export async function createMessage(
  input: Pick<Message, "tenant_id" | "property_id" | "source" | "content">,
  rules: Rule[],
): Promise<Message> {
  if (supabase) {
    const { data, error } = await supabase
      .from("messages")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return {
    ...input,
    id: newDemoId(),
    category: categorize(input.content, rules),
    status: "Open",
    created_at: new Date().toISOString(),
  };
}
export async function changeStatus(id: string, status: Status) {
  if (supabase) {
    const { error } = await supabase
      .from("messages")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
  }
}
export async function addRule(
  keyword: string,
  category: Rule["category"],
): Promise<Rule> {
  if (supabase) {
    const { data, error } = await supabase
      .from("rules")
      .insert({ keyword, category })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return { id: newDemoId(), keyword, category };
}
export async function deleteRule(id: string) {
  if (supabase) {
    const { error } = await supabase
      .from("rules")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
  }
}
