import { getSupabase } from "../../../lib/supabase-server.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (status = 503) =>
  Response.json(
    {
      error:
        "The demo workspace could not be loaded or saved. Please try again.",
    },
    { status },
  );
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const categories = ["Maintenance", "Payment", "General", "Urgent"];
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

export async function GET(request: Request) {
  try {
    const db = getSupabase();
    if (!db)
      return Response.json(
        { mode: "local" },
        { headers: { "Cache-Control": "no-store" } },
      );
    const conversation = new URL(request.url).searchParams.get("conversation");
    if (conversation) {
      if (!uuid(conversation)) return fail(400);
      const { data, error } = await db
        .from("messages")
        .select("*")
        .eq("reply_to", conversation)
        .eq("direction", "outgoing")
        .order("created_at")
        .order("id");
      if (error) throw error;
      return Response.json(
        { replies: data },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const results = await Promise.all([
      db.from("properties").select("*").order("id"),
      db.from("tenants").select("*").order("id"),
      db
        .from("messages")
        .select("*")
        .eq("direction", "incoming")
        .order("created_at", { ascending: false }),
      db.from("rules").select("*").order("id"),
    ]);
    for (const result of results) if (result.error) throw result.error;
    return Response.json(
      {
        mode: "supabase",
        data: {
          properties: results[0].data,
          tenants: results[1].data,
          messages: results[2].data,
          rules: results[3].data,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error(
      "[demo] Supabase read failed or configuration is incomplete.",
    );
    return fail();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (
      origin &&
      new URL(origin).host !==
        (request.headers.get("host") ?? new URL(request.url).host)
    )
      return fail(403);
  } catch {
    return fail(403);
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail(415);
  let input: Record<string, unknown>;
  try {
    if (Number(request.headers.get("content-length")) > 48000) return fail(413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 48000) return fail(413);
    input = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return fail(400);
  } catch {
    return fail(400);
  }
  try {
    const db = getSupabase();
    if (!db) return fail();
    if (input.action === "message") {
      if (
        !uuid(input.tenant_id) ||
        !uuid(input.property_id) ||
        !text(input.content, 10000) ||
        !["SMS", "Email", "WhatsApp", "Other"].includes(String(input.source))
      )
        return fail(400);
      const { data, error } = await db
        .from("messages")
        .insert({
          tenant_id: input.tenant_id,
          property_id: input.property_id,
          source: input.source,
          content: input.content.trim(),
          direction: "incoming",
        })
        .select()
        .single();
      if (error) throw error;
      return Response.json(data);
    }
    if (input.action === "reply") {
      if (
        !uuid(input.id) ||
        !uuid(input.conversationId) ||
        !text(input.content, 10000)
      )
        return fail(400);
      const row = {
        id: input.id,
        reply_to: input.conversationId,
        content: input.content.trim(),
        direction: "outgoing",
      };
      const result = await db.from("messages").insert(row).select().single();
      if (result.error?.code === "23505") {
        const existing = await db
          .from("messages")
          .select("*")
          .eq("id", input.id)
          .single();
        if (
          existing.error ||
          existing.data.reply_to !== row.reply_to ||
          existing.data.content !== row.content
        )
          return fail(409);
        return Response.json(existing.data);
      }
      if (result.error) throw result.error;
      return Response.json(result.data);
    }
    if (input.action === "status") {
      if (
        !uuid(input.id) ||
        !["Open", "Resolved"].includes(String(input.status))
      )
        return fail(400);
      const { data, error } = await db
        .from("messages")
        .update({ status: input.status })
        .eq("id", input.id)
        .eq("direction", "incoming")
        .select()
        .single();
      if (error) throw error;
      return Response.json(data);
    }
    if (input.action === "rule") {
      if (
        !text(input.keyword, 100) ||
        !categories.includes(String(input.category))
      )
        return fail(400);
      const { data, error } = await db
        .from("rules")
        .insert({
          keyword: input.keyword.trim().toLowerCase(),
          category: input.category,
        })
        .select()
        .single();
      if (error) throw error;
      return Response.json(data);
    }
    if (input.action === "deleteRule") {
      if (!uuid(input.id)) return fail(400);
      const { error } = await db
        .from("rules")
        .delete()
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return Response.json({ success: true });
    }
    return fail(400);
  } catch {
    console.error("[demo] Supabase write failed.");
    return fail();
  }
}
