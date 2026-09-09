import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GET, POST } from "../app/api/demo/route.ts";
import { POST as feedback } from "../app/api/feedback/route.ts";

const seed = JSON.parse(
  readFileSync(new URL("../lib/seed.json", import.meta.url), "utf8"),
);
const request = (body: unknown) =>
  new Request("http://localhost:3000/api/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("official Supabase SDK routes use the configured database and feedback is saved before Resend", async (t) => {
  const vars = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "RESEND_API_KEY",
    "FEEDBACK_EMAIL",
  ];
  const old = Object.fromEntries(vars.map((k) => [k, process.env[k]]));
  t.after(() => {
    for (const k of vars) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  });
  process.env.SUPABASE_URL = "https://demo.example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.RESEND_API_KEY = "test-only";
  process.env.FEEDBACK_EMAIL = "owner@example.com";
  const calls: { url: URL; method: string; body: Record<string, unknown> }[] =
    [];
  let failDatabase = false;
  t.mock.method(console, "error", () => {});
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, options?: RequestInit) => {
      const parsed = new URL(String(url));
      const body = options?.body ? JSON.parse(String(options.body)) : {};
      calls.push({ url: parsed, method: options?.method ?? "GET", body });
      if (parsed.hostname === "api.resend.com")
        return Response.json({ id: "email-test" });
      assert.equal(parsed.hostname, "demo.example.supabase.co");
      assert.equal(
        new Headers(options?.headers).get("apikey"),
        "sb_publishable_test",
      );
      if (failDatabase)
        return Response.json(
          { message: "private database error", code: "test" },
          { status: 500 },
        );
      if (parsed.pathname.endsWith("/rpc/submit_demo_feedback"))
        return new Response(null, { status: 204 });
      const table = parsed.pathname.split("/").pop()!;
      if ((options?.method ?? "GET") === "GET")
        return Response.json(seed[table]);
      return Response.json({ ...seed.messages[0], ...body });
    },
  );
  const loaded = await GET(new Request("http://localhost:3000/api/demo"));
  assert.equal(loaded.status, 200);
  const result = await loaded.json();
  assert.equal(result.mode, "supabase");
  assert.equal(result.data.properties.length, 3);
  assert.equal(result.data.messages.length, 12);
  assert.ok(
    calls.some((c) => c.url.searchParams.get("direction") === "eq.incoming"),
  );
  const incoming = await POST(
    request({
      action: "message",
      tenant_id: seed.tenants[0].id,
      property_id: seed.tenants[0].property_id,
      source: "SMS",
      content: "leak",
    }),
  );
  assert.equal(incoming.status, 200);
  const reply = await POST(
    request({
      action: "reply",
      id: "dd965138-c278-40b7-a0b9-5d45c141df9c",
      conversationId: seed.messages[0].id,
      content: "Demo reply",
    }),
  );
  assert.equal(reply.status, 200);
  assert.equal(calls.at(-1)?.body.direction, "outgoing");
  assert.equal(calls.at(-1)?.body.reply_to, seed.messages[0].id);
  await GET(
    new Request(
      "http://localhost:3000/api/demo?conversation=" + seed.messages[0].id,
    ),
  );
  assert.equal(
    calls.at(-1)?.url.searchParams.get("reply_to"),
    "eq." + seed.messages[0].id,
  );
  assert.equal(
    (
      await POST(
        request({
          action: "status",
          id: seed.messages[0].id,
          status: "Resolved",
        }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await POST(
        request({ action: "rule", keyword: "parcel", category: "General" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await POST(request({ action: "deleteRule", id: seed.rules[0].id })))
      .status,
    200,
  );
  assert.equal(
    (
      await POST(
        request({ action: "reply", conversationId: "bad", content: "" }),
      )
    ).status,
    400,
  );
  const payload = {
    id: "dd965138-c278-40b7-a0b9-5d45c141df9c",
    createdAt: new Date().toISOString(),
    liked: "Inbox",
    confusing: "",
    missing: "",
    wouldUse: "Yes",
  };
  calls.length = 0;
  const submitted = await feedback(request(payload));
  assert.equal(submitted.status, 200);
  assert.ok(calls[0].url.pathname.endsWith("submit_demo_feedback"));
  assert.equal(
    (calls[0].body.payload as Record<string, unknown>).would_use,
    "Yes",
  );
  assert.equal(calls[1].url.hostname, "api.resend.com");
  failDatabase = true;
  calls.length = 0;
  const error = await feedback(request(payload));
  assert.equal(error.status, 503);
  assert.equal(calls.length, 1);
  assert.ok(!(await error.text()).includes("private database error"));
  const loadError = await GET(new Request("http://localhost:3000/api/demo"));
  assert.equal(loadError.status, 503);
  assert.ok(!(await loadError.text()).includes("private database error"));
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.equal(
    (await GET(new Request("http://localhost:3000/api/demo"))).status,
    503,
  );
  delete process.env.SUPABASE_URL;
  assert.equal(
    (await (await GET(new Request("http://localhost:3000/api/demo"))).json())
      .mode,
    "local",
  );
});
