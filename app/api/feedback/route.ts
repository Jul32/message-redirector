import { Resend } from "resend";
import { getSupabase } from "../../../lib/supabase-server.ts";

export const runtime = "nodejs";
// Log only provider codes/statuses, never raw errors, credentials, or answers.
function diagnostic(stage: string, error: unknown, status?: number) {
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  const code = typeof value.code === "string" ? value.code : value.name;
  const safeCode =
    typeof code === "string" && /^[a-zA-Z0-9_]{1,64}$/.test(code)
      ? code
      : "unknown_error";
  console.error("[feedback]", { stage, code: safeCode, status });
}
function notificationFailed(saved: boolean, code: string, status = 502) {
  if (saved)
    return Response.json({
      success: true,
      saved: true,
      emailSent: false,
      code,
    });
  return Response.json(
    {
      success: false,
      saved: false,
      emailSent: false,
      code,
      error:
        "The feedback notification could not be sent. Your answers have been kept. Please try again later.",
    },
    { status },
  );
}
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const uuidPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    // Next.js may normalize request.url to an internal hostname. Host preserves
    // the public address used by the browser (including loopback and Vercel).
    const host = request.headers.get("host") ?? new URL(request.url).host;
    try {
      const source = new URL(origin);
      if (
        !["http:", "https:"].includes(source.protocol) ||
        source.host !== host
      )
        return fail("Please submit feedback from Local Haven.", 403);
    } catch {
      return fail("Please submit feedback from Local Haven.", 403);
    }
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    return fail("Please submit a valid feedback form.", 415);
  let value: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 64000)
      return fail("Your feedback is too long.", 413);
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 64000)
      return fail("Your feedback is too long.", 413);
    value = JSON.parse(body);
  } catch {
    return fail("Please submit a valid feedback form.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail("Please submit a valid feedback form.", 400);
  const input = value as Record<string, unknown>;
  for (const [key, limit] of [
    ["liked", 4000],
    ["confusing", 4000],
    ["missing", 4000],
    ["name", 120],
    ["email", 254],
  ] as const) {
    if ((key === "name" || key === "email") && input[key] === undefined)
      continue;
    if (typeof input[key] !== "string" || input[key].length > limit)
      return fail("Please check the feedback fields and try again.", 400);
  }
  if (
    typeof input.id !== "string" ||
    !uuidPattern.test(input.id) ||
    typeof input.createdAt !== "string" ||
    input.createdAt.length > 30 ||
    Number.isNaN(Date.parse(input.createdAt)) ||
    typeof input.wouldUse !== "string" ||
    !["Yes", "Maybe", "No"].includes(input.wouldUse)
  )
    return fail("Please check the feedback fields and try again.", 400);
  const contact = typeof input.email === "string" ? input.email.trim() : "";
  if (contact && !emailPattern.test(contact))
    return fail("Please check your email address.", 400);

  // Save before emailing. The write-only RPC makes retries safe without granting
  // public readers access to names, email addresses, or previous feedback.
  let saved = false;
  let databaseStage = "supabase_config";
  try {
    const db = getSupabase();
    if (db) {
      databaseStage = "supabase_insert";
      const { error, status } = await db.rpc("submit_demo_feedback", {
        payload: {
          id: input.id,
          liked: input.liked,
          confusing: input.confusing,
          missing: input.missing,
          would_use: input.wouldUse,
          name: input.name || null,
          email: contact || null,
          created_at: input.createdAt,
        },
      });
      if (error) {
        diagnostic(databaseStage, error, status);
        return Response.json(
          {
            error:
              "Your feedback could not be saved. Your answers have been kept. Please try again later.",
            code: "FEEDBACK_SAVE_FAILED",
          },
          { status: 503 },
        );
      }
      saved = true;
    }
  } catch (error) {
    diagnostic(databaseStage, error);
    return Response.json(
      {
        error:
          "Your feedback could not be saved. Your answers have been kept. Please try again later.",
        code: "FEEDBACK_SAVE_FAILED",
      },
      { status: 503 },
    );
  }

  // These variables are read only inside the server route, never returned or logged.
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.FEEDBACK_EMAIL?.trim();
  if (!recipient || !emailPattern.test(recipient)) {
    console.error("[feedback] FEEDBACK_EMAIL is missing or invalid.");
    return notificationFailed(saved, "FEEDBACK_NOTIFICATION_CONFIG", 503);
  }
  if (!apiKey) {
    console.error("[feedback] RESEND_API_KEY is not configured.");
    return notificationFailed(saved, "FEEDBACK_NOTIFICATION_CONFIG", 503);
  }
  const answer = (key: string) =>
    typeof input[key] === "string" && input[key].trim()
      ? input[key].trim()
      : "(Not provided)";
  // Plain text prevents user-provided answers from injecting email markup.
  const text = [
    "Local Haven demo feedback",
    `Submission timestamp (UTC): ${new Date(input.createdAt).toISOString()}`,
    `What did you like?\n${answer("liked")}`,
    `What was confusing?\n${answer("confusing")}`,
    `What feels missing?\n${answer("missing")}`,
    `Would you use this?\n${input.wouldUse}`,
    `Name: ${answer("name")}`,
    `Email: ${contact || "(Not provided)"}`,
  ].join("\n\n");
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: "Local Haven Feedback <onboarding@resend.dev>",
        to: [recipient],
        subject: "New Local Haven demo feedback",
        text,
        ...(contact ? { replyTo: contact } : {}),
      },
      { idempotencyKey: `feedback/${input.id}` },
    );
    if (error || !data?.id) {
      diagnostic("resend_send", error, error?.statusCode ?? undefined);
      return notificationFailed(saved, "FEEDBACK_NOTIFICATION_FAILED");
    }
    return Response.json({ success: true });
  } catch (error) {
    diagnostic("resend_send", error);
    return notificationFailed(saved, "FEEDBACK_NOTIFICATION_FAILED");
  }
}
