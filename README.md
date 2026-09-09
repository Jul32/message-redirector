# Local Haven — property management demo inbox

Next.js App Router, TypeScript, Tailwind CSS, the official Supabase JavaScript client, and Resend for feedback emails. There is no sign-in flow. Tenant replies are simulated: they never deliver email, SMS, or WhatsApp messages.

## Connect your new Supabase project

1. In the **new project's SQL Editor**, run **`supabase/demo-setup.sql` in full**. It creates the five tables, constraints, indexes, triggers, RLS policies, feedback submission function, and all seed data. It is repeatable and does not overwrite existing records.
2. **Do not run `supabase/migrations/001_initial.sql` or `002_seed_function.sql`.** Those are retained historical files for the earlier authenticated architecture. The new setup refuses to run against that owner-based schema rather than dropping your data. Use the new empty project requested for this demo.
3. Copy `.env.example` to `.env.local` for local use. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from your Supabase project. Use its publishable key, not a secret/service-role key.
4. Add the same variables in Vercel for the deployment environment you use, and redeploy. No `NEXT_PUBLIC_` variables are needed. The older `NEXT_PUBLIC_SUPABASE_*` names are no longer used.
5. For feedback emails, also set the existing `RESEND_API_KEY` and the recipient `FEEDBACK_EMAIL`. Neither credential nor recipient is hardcoded.

All four variables are server-only. Browser requests go to Next.js routes, and the server uses the publishable key with the `anon` role. No privileged service-role credential is required or used. No session is created. Supabase secrets and private configuration are never sent in API responses.

## Run

Requires Node.js 22+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. For a stable preview, stop the dev server, run `npm run build`, then `npm start`.

When both Supabase variables are absent, the app keeps the existing explicitly labeled local demo with browser persistence. When both are set, reads and writes use Supabase. A partial configuration, unreachable database, or failed query shows a friendly error and retry; it never silently switches to local data. Existing local demo records/replies are not automatically uploaded. The SQL seeds preserve the original 3 properties, 5 tenants, 12 incoming messages, and 5 rules.

## Tables and persistence

- `properties`: seeded property names and addresses; publicly readable, no public writes.
- `tenants`: seeded names, example email addresses, and property relationships; publicly readable, no public writes.
- `messages`: tenant, property, channel/source, content, category, status, timestamp, direction, and optional `reply_to` pointing to an incoming message. Inbox queries show only incoming rows, so replies do not inflate inbox counts.
- `rules`: keyword/category mappings; public demo visitors may read, add, and delete rules.
- `feedback`: liked, confusing, missing, would_use, optional name/email, created_at, and a UUID for safe retries. **No public reads, updates, or deletes.**

Each existing incoming message is a conversation. Sending a demo reply inserts an outgoing `messages` row with `reply_to` set to that conversation. A database trigger copies its tenant, property, source, category, and status from the parent; nested replies and mismatched tenant/property links are rejected. Refreshing or reopening reads the reply rows from Supabase, and another browser sees the same shared conversation. A stable UUID prevents duplicate replies on retry. Status changes do not remove replies. Replies remain visually marked as outgoing/demo, and “Open in original app” only shows the coming-soon notice.

New incoming messages are categorized by a database trigger: matching is case-insensitive substring matching, Urgent wins, then lowest rule UUID breaks ties, and unmatched text goes to General. Existing categories do not change when rules change.

The previous local fallback remains available without configuration. Local replies use `haven-demo-replies-v1:<message-id>`, inbox data uses `haven-inbox-v1`, and first-visit onboarding uses `haven-demo-guide-v1=seen`. With Supabase configured, inbox data and replies are no longer written to those local keys. Onboarding remains local.

## Feedback and Resend

The anonymous-friendly form posts to `/api/feedback`. With Supabase configured, the server first calls the write-only `submit_demo_feedback` function. Its fixed search path and narrow insert-only behavior prevent public callers from reading responses. Repeated UUIDs do not overwrite or duplicate feedback. After successful storage, the existing Resend email behavior runs unchanged. Database failure prevents the email and returns a friendly retry message. Resend failure leaves the saved response in Supabase; retrying the same form attempts email again without creating another feedback row.

There is no distributed transaction between Supabase and Resend and no background email retry worker. A saved response can therefore exist without a sent email. Review feedback in the Supabase dashboard, and review email acceptance/delivery in Resend. Unchanged retries within the same open form retain the same UUID/timestamp and use Resend's 24-hour idempotency support. Editing or reopening the form creates a new submission.

The sender remains `Local Haven Feedback <onboarding@resend.dev>`. That testing sender only delivers to the email associated with your Resend account; a different recipient needs a verified domain and matching sender. [Resend testing sender documentation](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). Optional contact email is Reply-To, never the recipient. Missing configuration returns a sanitized 503; provider failure returns a sanitized 502. No automatic migration/emailing of previously stored browser feedback occurs. Without Supabase configuration, the existing Resend-only feedback path remains available.

## Public demo security limitations

**Use only fictional property, tenant, and conversation data.** This is one shared public demo, not private manager workspaces. Everyone using the app can see all demo messages and replies, create messages, change statuses, and add/delete rules. Keeping the publishable key server-side does not make the publicly accessible routes private. RLS restricts operations, not one tester from another. Messages cannot be deleted or have their original content/property/tenant overwritten by public callers. Property and tenant edits are blocked.

Feedback identities are protected from public reading: the table has RLS enabled and no public privileges, and its narrowly scoped SECURITY DEFINER function only inserts, never returns or updates records. Anonymous callers can still submit junk/spam feedback or alter the shared demo via the allowed operations. There is no authentication, user isolation, or durable abuse-rate limiter. Use a separate demo project and reset/test with fictional data. Add authentication/ownership or a protected access model before using real tenant information. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Architecture and validation

- `lib/supabase-server.ts`: official SDK configuration used only by server routes.
- `app/api/demo/route.ts`: read workspace/replies, add incoming messages/replies, change status, add/delete rules.
- `lib/store.ts`: small client API layer with explicit local fallback only when unconfigured.
- `lib/demo-replies.ts` and `components/demo-conversation.tsx`: same simulated messaging UI, async persistence and retry.
- `app/api/feedback/route.ts`: validate → save in Supabase → send through Resend.
- `components/dashboard.tsx`: existing inbox/views/filters, without the old authentication gate.

```sh
npm test
npm run typecheck
npm run build
# Start the app in another terminal, then:
npm run test:browser
node tests/demo-messaging.cjs
node tests/demo-testing.cjs
node tests/supabase-browser.cjs
```

Install Chromium with `npx playwright install chromium` (and, if needed, `npx playwright install-deps chromium`). Standard browser tests use unconfigured/local mode; the Supabase browser test uses a persistent database fixture to verify connected-mode reloads, cross-browser reads, errors, and retries. SDK tests mock transport, including Supabase storage before Resend and suppression of email on database failure. They do not send live emails.

`tests/supabase-schema.cjs` executes the SQL against a temporary PostgreSQL-compatible PGlite runtime, including actual RLS/grants, seed repeatability, constraints, reply association, and write-only feedback. To reproduce without adding a project dependency, install `@electric-sql/pglite` in a temporary directory and set `PGLITE_MODULE` to that package's absolute path before running the test.

No Supabase or Resend credentials are available in this workspace. Live connection, project schema application, remote reply persistence, feedback storage, and email delivery must be verified after you run the SQL and configure the four variables. The setup and app code are prepared and locally tested; this repository does not provision your remote project automatically.
