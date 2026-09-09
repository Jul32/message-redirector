# Haven — property management inbox

A minimal Next.js App Router + TypeScript + Tailwind CSS app with Supabase authentication and PostgreSQL storage. No channel integrations, AI, or payments.

## Run locally

Requires Node.js 22+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Without Supabase environment variables the app runs in a **clearly labeled demo workspace**, initialized with three properties, five tenants, twelve messages, and five rules. Demo changes persist in this browser's localStorage. Clear the `haven-inbox-v1` localStorage entry to reset examples. This mode contains fictional data and has no authentication.

## Connect Supabase

1. Create a Supabase project and run `supabase/migrations/001_initial.sql`, then `supabase/migrations/002_seed_function.sql` in its SQL editor, in order. The second migration creates an authenticated, idempotent seed function; it does not create accounts.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your project's settings. Use the public publishable key, never a service-role key.
3. Set the Supabase Auth Site URL to your app URL (http://localhost:3000 during development). Restart Next.js.
4. Create an account in the app, confirm its email if required, and sign in. Click **Load example workspace** in the empty inbox to seed that manager's database records.

Each manager has an independent workspace. Ownership is enforced by Supabase row-level security, including composite foreign keys preventing messages from referencing another manager's tenants or a mismatched property. There are no organization roles or team invitations in this MVP. The Westside Living workspace label is a demo brand placeholder.

## Implemented workflows

- Inbox, Open, Resolved, Categories, Properties, and Rules views.
- Search message content and tenant names; combine property, category, and status filters.
- Manually create messages for a seeded tenant; property follows the tenant.
- Read full messages in keyboard-accessible native dialogs; resolve and reopen.
- Add and remove case-insensitive keyword rules, with duplicate prevention.
- Literal substring matching. Urgent matches take priority; otherwise the lowest UUID wins for deterministic results. Default is General. Rule changes affect only new messages.
- Database triggers enforce categorization for Supabase inserts. Demo mode uses the corresponding pure TypeScript function.
- Responsive dashboard, empty/loading states, error reporting, and success notifications.

## Structure

- `app/`: Next.js entry point, layout, global styles / Tailwind.
- `components/`: dashboard UI and dependency-free SVG icon component.
- `lib/types.ts`: core entities and enum values.
- `lib/store.ts`: small data access layer for Supabase or local demo.
- `lib/rules.ts`: pure keyword categorization for demo and previews.
- `lib/seed.json`: fictional demonstration records.
- `supabase/migrations/`: relational schema, constraints, RLS, trigger, seed function.
- `tests/`: focused categorization regression tests.

## Stable local preview

For a preview without development hot reload, run `npm run build`, then `npm start`, and open http://127.0.0.1:3000. Stop the development server before starting the production server on the same port. Both modes serve the JavaScript needed by the controls; opening build HTML directly is unsupported. `next.config.ts` permits the loopback development origin and this Codespace's forwarded preview origin.

## Verify

```sh
npm test
npm run typecheck
npm run build
npm start
```

In a second terminal, run the browser suite against the running **demo-mode** server:

```sh
npx playwright install chromium
npm run test:browser
```

On Linux, the first browser install may also require `npx playwright install-deps chromium`. Playwright is a development-only dependency. The browser suite defaults to `http://127.0.0.1:3000`; set `TEST_BASE_URL` to test another local address. It uses isolated contexts so it does not alter the workspace in your browser.

Supabase authentication, migration application, and database policies require a configured project for end-to-end verification. Demo mode works independently. No live database credentials are included.

Demo storage errors fall back to tab-local state with a visible persistence warning. Invalid saved data is validated before rendering. New messages clear incompatible filters and appear at the top of the inbox. Status tabs and sidebar state stay synchronized; workspace details, date sorting, row actions, and modal close/cancel controls are interactive.

The MVP intentionally uses a single client dashboard and a small repository module. Page sections use local UI state; there is no routing library or global state dependency. Properties and tenants are seeded and viewable; creation/editing is the next product step.

## Verification performed

The production build and TypeScript checks pass. Rule and storage regression tests cover categorization, malformed cached data, denied storage access, persistence, and ID generation without `randomUUID`. The checked-in Chromium test (`tests/browser.cjs`) covers navigation, summary cards, workspace details, help, sorting, combined filters, search, category/property drill-downs, rule creation/deletion/duplicates, message creation, resolve/reopen, reload persistence, modal controls, mobile layout, denied/corrupt storage, and JavaScript asset loading at `127.0.0.1`. Live Supabase checks still require a configured project.

## Next priorities

1. Add property and tenant creation/editing, including move-out and reassignment handling.
2. Add conversation history and internal notes so managers can track follow-up context.
3. Validate with a small manager pilot and add Supabase end-to-end tests for sign-in, ownership isolation, and message workflows before production use.

Reference documentation: [Next.js CSS setup](https://nextjs.org/docs/app/getting-started/css), [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Private demo messaging

Open an inbox message to see its incoming message and a local reply composer. **Send** adds an outgoing bubble with a timestamp; **Demo mode** explains that nothing is delivered. **Open in original app** only displays “External messaging integration coming soon.” It does not navigate, launch an app, or create a deep link.

Demo replies never use Supabase or any messaging API. They are stored separately in this browser's localStorage under `haven-demo-replies-v1:<message-id>`. Each existing inbox message is a distinct conversation, including separate messages from the same tenant. Replies persist across closing/reopening and reloads, and do not change inbox counts, categories, or statuses. If storage is unavailable, replies remain in memory for the current tab with a visible warning. Drafts are discarded when the conversation closes. Clear a conversation's storage entry and reload to remove its demo replies.

With the app running in demo mode, run `node tests/demo-messaging.cjs` to verify multiple replies, conversation isolation, reload persistence, blocked storage, and the absence of network requests or external app launches from either demo action. `npm run test:browser` verifies the existing inbox flows.

## Demo onboarding and feedback

The first visit shows a three-step guide. Next and Back navigate the steps; Explore demo, Skip, the close button, and Escape dismiss it. The browser stores `haven-demo-guide-v1=seen` in localStorage, so it stays dismissed after reload. **View demo guide** in the top bar reopens it anytime. Clearing browser data or using another browser/origin starts a new first visit. If storage is denied, dismissal lasts for the current page session and a notice explains that future visits cannot be remembered.

**Give feedback** opens an anonymous-friendly form. The three free-text questions and name/email are optional; the Yes/Maybe/No usage question is required. Feedback now posts to `POST /api/feedback`, which validates the fields and sends a plain-text email through the server-side Resend SDK. Optional contact email is included in the email and used as Reply-To; it never controls the recipient or sender. The email includes every answer and the submission timestamp in UTC.

### Feedback email configuration

Set these server-only variables in the Vercel project's environment settings for the deployment environment you use, then redeploy:

- `RESEND_API_KEY`: reuse the existing Resend API key.
- `FEEDBACK_EMAIL`: the address that should receive feedback (one address).

Never prefix these with `NEXT_PUBLIC_`. For local live testing, configure them in the ignored `.env.local` file and restart the app. `.env.example` contains empty placeholders only. No secrets or personal recipient addresses are committed.

The sender is `Local Haven Feedback <onboarding@resend.dev>`. Resend's testing domain can only send to the email address associated with the Resend account; for another recipient, a verified sending domain and a corresponding sender address will be needed. See [Resend's testing sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Missing/invalid `FEEDBACK_EMAIL` or a missing key returns HTTP 503 with a friendly client message and a configuration diagnostic in server logs. Provider failures return HTTP 502. The client preserves answers, disables the form during sending, and only shows success after Resend accepts the email. Acceptance does not guarantee inbox delivery; inspect Resend's delivery status for that. The route never returns provider details, the recipient address, or the API key. Application logs contain fixed diagnostic messages only.

A submission lock prevents repeated clicks. Retrying unchanged answers from the same open form reuses the submission ID and timestamp, which are sent to Resend with an idempotency key. Resend deduplicates those requests for 24 hours. Editing answers creates a new ID to avoid mismatched-payload conflicts. Closing/reopening the form starts a new submission. See [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

New feedback is no longer saved in localStorage; old `haven-demo-feedback-v1:` entries remain untouched and are not automatically emailed. Onboarding state and simulated conversation replies are unchanged and still local-only. No tenant email, SMS, or WhatsApp integration has been added.

### Feedback verification

- `npm test`: validation, missing config, sender/recipient mapping, optional identity, provider errors, duplicate request keys, and secret-free production diagnostics. The actual Resend SDK runs against a mocked HTTP transport using synthetic credentials; no test emails are sent.
- `node tests/demo-testing.cjs`: onboarding plus anonymous/contact feedback, loading/disabled states, duplicate-click prevention, friendly server errors and retry. The feedback endpoint is mocked in this browser suite to avoid emailing on every test run.
- `npm run test:browser` and `node tests/demo-messaging.cjs`: unchanged inbox and local reply workflows.
- Live delivery requires both server environment variables. Open the form on the configured deployment, submit test feedback, then check Resend's delivery status and the recipient inbox. Neither credential nor recipient is configured locally in this checkout, so live acceptance/delivery could not be verified here.
