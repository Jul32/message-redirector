import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/feedback/route.ts";

const submission = {
  id: "4d8b7402-6b5b-4f2f-b7d8-98442cba87b7",
  createdAt: "2026-09-09T10:00:00.000Z",
  liked: "Simple inbox",
  confusing: "Filters",
  missing: "History",
  wouldUse: "Maybe",
};
function request(body: unknown = submission, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

test("feedback route validates input and calls the real Resend SDK with private config", async (t) => {
  // Synthetic credentials never leave this process: the SDK's HTTP transport is mocked.
  const previousMode = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  t.after(() => {
    if (previousMode === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previousMode });
  });
  const previousKey = process.env.RESEND_API_KEY,
    previousRecipient = process.env.FEEDBACK_EMAIL;
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousRecipient === undefined) delete process.env.FEEDBACK_EMAIL;
    else process.env.FEEDBACK_EMAIL = previousRecipient;
  });
  const previousUrl = process.env.SUPABASE_URL,
    previousPublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  t.after(() => {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousPublishableKey === undefined)
      delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = previousPublishableKey;
  });
  process.env.SUPABASE_URL = "https://demo.example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  process.env.RESEND_API_KEY = "test-only-placeholder";
  process.env.FEEDBACK_EMAIL = "owner@example.com";
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => logs.push(args));
  const calls: {
    url: string;
    body: Record<string, unknown>;
    headers: Headers;
  }[] = [];
  let providerStatus = 200;
  let throwNetwork = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, options?: RequestInit) => {
      if (String(url).endsWith("/rpc/submit_demo_feedback"))
        return new Response(null, { status: 204 });
      calls.push({
        url: String(url),
        body: JSON.parse(String(options?.body)),
        headers: new Headers(options?.headers),
      });
      if (throwNetwork) throw new Error("private provider detail");
      return Response.json(
        providerStatus === 200
          ? { id: "test-email-id" }
          : { name: "validation_error", message: "private provider detail" },
        { status: providerStatus },
      );
    },
  );
  const success = await POST(
    request({
      ...submission,
      name: "Anonymous Tester",
      email: "tester@example.com",
      to: "untrusted@example.com",
    }),
  );
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), {
    success: true,
    saved: true,
    emailSent: true,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(calls[0].body.to, ["owner@example.com"]);
  assert.equal(
    calls[0].body.from,
    "Local Haven Feedback <onboarding@resend.dev>",
  );
  assert.equal(calls[0].body.reply_to, "tester@example.com");
  assert.equal(
    calls[0].headers.get("Idempotency-Key"),
    `feedback/${submission.id}`,
  );
  for (const text of [
    "Simple inbox",
    "Filters",
    "History",
    "Maybe",
    "Anonymous Tester",
    "tester@example.com",
    submission.createdAt,
  ])
    assert.ok(String(calls[0].body.text).includes(text));
  await POST(request());
  await POST(request());
  assert.deepEqual(calls[1].body, calls[2].body);
  assert.equal(
    calls[1].headers.get("Idempotency-Key"),
    calls[2].headers.get("Idempotency-Key"),
  );
  assert.equal(calls[1].body.reply_to, undefined);
  assert.ok(String(calls[1].body.text).includes("Name: (Not provided)"));
  const proxied = new Request("http://internal:3000/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "demo.example.com",
      origin: "https://demo.example.com",
    },
    body: JSON.stringify(submission),
  });
  assert.equal((await POST(proxied)).status, 200);
  const loopback = new Request("http://localhost:3000/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    },
    body: JSON.stringify(submission),
  });
  assert.equal((await POST(loopback)).status, 200);
  const count = calls.length;
  for (const invalid of [
    { ...submission, wouldUse: "Always" },
    { ...submission, wouldUse: ["Yes"] },
    { ...submission, liked: "x".repeat(4001) },
    { ...submission, email: "bad\naddress@example.com" },
    { ...submission, id: "bad" },
    null,
    { ...submission, createdAt: "bad" },
  ]) {
    assert.equal((await POST(request(invalid))).status, 400);
  }
  assert.equal(
    (await POST(request(submission, "https://external.example"))).status,
    403,
  );
  assert.equal(
    (await POST(request({ ...submission, liked: "x".repeat(64000) }))).status,
    413,
  );
  assert.equal(
    (
      await POST(
        new Request("http://localhost:3000/api/feedback", {
          method: "POST",
          body: "broken",
          headers: { "content-type": "application/json" },
        }),
      )
    ).status,
    400,
  );
  assert.equal(calls.length, count);
  delete process.env.FEEDBACK_EMAIL;
  let response = await POST(request());
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("FEEDBACK_EMAIL"));
  process.env.FEEDBACK_EMAIL = "owner@example.com";
  delete process.env.RESEND_API_KEY;
  response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal(calls.length, count);
  process.env.RESEND_API_KEY = "test-only-placeholder";
  providerStatus = 403;
  response = await POST(request());
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("private provider detail"));
  throwNetwork = true;
  response = await POST(request());
  assert.equal(response.status, 502);
  const sendsBeforeMissingDatabase = calls.length;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  response = await POST(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "FEEDBACK_SAVE_CONFIG");
  assert.equal(calls.length, sendsBeforeMissingDatabase);
  const logged = JSON.stringify(logs);
  assert.ok(!logged.includes("test-only-placeholder"));
  assert.ok(!logged.includes("owner@example.com"));
  assert.ok(!logged.includes("private provider detail"));
});
