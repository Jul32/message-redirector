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
