# Void Dashboard

A general-purpose admin dashboard template built with TanStack Start, React, Vite, TanStack Router, and Tailwind CSS v4. The UI is Chinese by default, uses blue accents with light and dark themes, includes interactive sample workflows, and supports DEV, UAT, and PROD environments.

The Void mark combines an open ring with an inward V, using negative space and the dashboard's blue-and-white palette. The shared SVG component lives in `src/components/BrandMark.tsx`; matching favicon, Apple touch icon, and manifest assets are provided in `public/`.

## Included modules

| Module                         | Features                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard layout               | Collapsible desktop sidebar, modal mobile navigation, breadcrumbs, global user search, current environment badge, and account logout                                                            |
| Overview `/`                   | Recharts revenue and status charts, 7/30/90-day reporting periods, tooltips, CSV reports, live user statistics, and recently added members                                                      |
| User management `/users`       | Search, role and status filters, sorting, pagination, empty states, add/edit forms, confirmation before disabling, reactivation, and export of all filtered results                             |
| Workspace settings `/settings` | Name, contact email, notification preferences, validation, unsaved-change navigation protection, cross-tab conflict handling, JSON backup/restore, demo reset, account, and appearance settings |
| Login `/login`                 | Server-side cookie sessions, admin and read-only demo accounts, submission and error states, password visibility, returning to the requested page after login, and logout                       |
| Template guide `/about`        | Feature descriptions and guidance for connecting real services                                                                                                                                  |
| Shared UI                      | Light/dark/system themes, toast notifications, loading states, retry actions, 404 pages, keyboard focus, and reduced-motion support                                                             |
| Multiple environments          | Typed public configuration, mode validation, separate build directories, and environment-specific cookies and demo data                                                                         |

User records and workspace settings are demo data stored in the browser, rather than in a database. Revenue is a fixed sample report, explicitly dated as of 2026/09/30; user counts and distributions update as you manage the list. Member records in user management are independent of the two login accounts. Adding a member does not create a login account, and a pending invitation does not send an email.

## Quick start

Use pnpm 12.4.1 or a newer compatible version. The project pins Node.js 26.10.0 through `devEngines.runtime`. Running `pnpm install` downloads a runtime for this project, which subsequent pnpm scripts use automatically without replacing your system Node.js. See the [pnpm runtime management documentation](https://pnpm.io/package_json#devenginesruntime).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Demo authentication is enabled by default in DEV, so local development does not require an additional environment file.

Dependencies were updated to the latest stable npm releases available on 2026-10-04, with exact versions and a synchronized lockfile. Type checking uses the TypeScript 7 native compiler through the `@typescript/native` alias. The `typescript` dependency points to the official `@typescript/typescript6` compatibility package for tools such as ESLint that still rely on the JavaScript compiler API. Run `pnpm typecheck` to use TypeScript 7, or `pnpm exec tsc6` to check with the compatibility version when needed. See the [official TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) for this side-by-side setup.

| Demo role        | Email                | Password     | Permissions                                               |
| ---------------- | -------------------- | ------------ | --------------------------------------------------------- |
| Admin            | `admin@example.com`  | `Admin123!`  | View, export, manage members, and edit workspace settings |
| Read-only member | `viewer@example.com` | `Viewer123!` | View, filter, export, and change the theme on this device |

These credentials are public demo data. Sessions store only the account ID, and roles are resolved through the server-side adapter. Passwords are never stored in browser storage or login URLs. Editing actions on pages and Provider write methods are restricted to administrators. Real applications must still enforce authorization at every server-side read and write endpoint.

## DEV / UAT / PROD

The application environment is selected by `VITE_APP_ENV`, while Vite loads configuration using `--mode`. They must match; invalid configuration immediately stops startup or the build.

| Application environment | Vite mode     | Version-controlled defaults | Local overrides          | Build directory | Demo login by default |
| ----------------------- | ------------- | --------------------------- | ------------------------ | --------------- | --------------------- |
| DEV                     | `development` | `.env.development`          | `.env.development.local` | `dist/dev`      | Enabled               |
| UAT                     | `uat`         | `.env.uat`                  | `.env.uat.local`         | `dist/uat`      | Disabled              |
| PROD                    | `production`  | `.env.production`           | `.env.production.local`  | `dist/prod`     | Disabled              |

```sh
# Start the Vite development server with the matching environment configuration
pnpm dev:dev
pnpm dev:uat
pnpm dev:prod

# Build the client and SSR server for each environment
pnpm build:dev
pnpm build:uat
pnpm build:prod

# Preview the existing build for the selected environment locally
pnpm preview:dev
pnpm preview:uat
pnpm preview:prod
```

`pnpm dev` is equivalent to `dev:dev`. Both `pnpm build` and `pnpm preview` default to PROD. The three builds use separate directories and do not overwrite one another. Run the matching build before the first preview. `dev:prod` loads production configuration but still runs a development server; production configuration and an optimized production build are separate concepts.

Vite reads `.env`, `.env.local`, `.env.[mode]`, and `.env.[mode].local`. Mode-specific files take precedence over generic files, and environment variables already present in the process have the highest priority. Put shared local overrides in `.env.local` and environment-specific overrides in the matching mode's `.local` file. Local override files are ignored by Git. Restart the development or preview server after changing environment files, and rebuild after changing public configuration. See [Vite environment variables and modes](https://vite.dev/guide/env-and-mode).

### Configuration and boundaries

| Variable            | Scope              | Description                                                                                                                            |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_ENV`      | Public, build time | Accepts only `DEV`, `UAT`, or `PROD`; must match the Vite mode                                                                         |
| `VITE_APP_NAME`     | Public, build time | Brand name, 1-60 characters; defaults to `Void`                                                                                        |
| `VITE_API_BASE_URL` | Public, build time | Reserved for API integration; accepts an HTTP(S) URL or a same-origin path such as `/api`; empty by default                            |
| `DEMO_AUTH_ENABLED` | Server runtime     | Accepts only `true` or `false`; demo authentication is disabled by default in UAT/PROD                                                 |
| `SESSION_SECRET`    | Server runtime     | When demo authentication is enabled, UAT/PROD servers and all built server artifacts require a random secret of at least 32 characters |

Setting `VITE_API_BASE_URL` only provides API configuration. **It does not automatically replace browser demo data with remote data.** Replace the Provider's read and write adapters to connect a backend. Public configuration is validated and read centrally through `src/config/env.ts`. Secrets must never use the `VITE_` prefix.

Local Vite development and preview servers load both server-side settings from environment files. For deployed servers, the deployment platform must inject `SESSION_SECRET` and `DEMO_AUTH_ENABLED` at runtime. Providing a secret during the build does not embed it in the build artifacts. Only the DEV development server may use the default development secret. `build:dev` still creates an optimized production build, so running demo login from that build also requires a configured secret.

To test the demo flows locally in UAT, copy the relevant entries from `.env.example` into `.env.uat.local`, enable demo authentication, and provide a random secret:

```dotenv
DEMO_AUTH_ENABLED=true
SESSION_SECRET=replace-with-a-random-secret-of-at-least-32-characters
```

Serve UAT/PROD login over HTTPS. Cookies used by built server artifacts and UAT/PROD servers have `Secure`, `HttpOnly`, and `SameSite=Lax` attributes and expire after 8 hours. Production applications should use a real identity service instead of the public demo accounts.

Session cookies are named `void-session-dev`, `void-session-uat`, and `void-session-prod`. Demo data storage keys also include an environment suffix to prevent environments on the same domain from overwriting one another. The theme is a display preference shared on the current device. Authentication pages and session requests use `Cache-Control: private, no-store`.

## Backups and editing safety

Use **工作区设置 → 数据备份与恢复** to download a JSON backup of saved members and workspace settings. Backups contain member names and email addresses, so store them appropriately. Login accounts, sessions, passwords, theme preferences, and unsaved settings drafts are excluded. Read-only accounts may download backups; only administrators may restore or reset data.

To restore, select a JSON backup of at most 1 MB. The application validates its version, member fields, unique IDs and email addresses, dates, settings, and member limit before showing a preview. Nothing changes until you confirm. Restoring replaces the entire member list and saved settings in the current environment; it does not merge records. The same backup may be restored into another browser or environment deliberately. Resetting demo data also requires confirmation. Save or cancel unsaved settings before either operation. A browser storage failure is reported explicitly; in that case the restored data is available only in the current page and may be lost on refresh.

Settings drafts remain intact when another tab changes saved settings. A conflict notice lets you load the latest settings or explicitly save your draft over them. Leaving the page with unsaved changes prompts for confirmation, including SPA navigation and browser refresh or close where supported. Browsers control whether a native refresh/close prompt appears. Member activation and deactivation update only the latest record's status, preserving other fields changed while a confirmation dialog was open.

## Project structure and extension points

```text
src/
  config/env.ts                      # Parse and validate public environment configuration
  components/DashboardLayout.tsx     # Sidebar, top bar, search, account, and mobile navigation
  components/DashboardProvider.tsx   # Demo data adapter, role restrictions, persistence, and cross-tab sync
  components/DemoDataTools.tsx        # JSON backup, validated restore preview, and confirmed demo reset
  components/DashboardCharts.tsx     # Recharts revenue, member status, and metric charts
  components/Select.tsx              # Shared dropdowns for reporting, filters, and member forms
  components/BrandMark.tsx           # Void portal mark shared by login and navigation
  components/Dialog.tsx              # Native modal dialog and focus restoration
  components/ToastProvider.tsx       # Action feedback
  components/ThemeToggle.tsx         # Appearance preferences, system theme, and synchronization across instances
  data/dashboard.ts                  # Member types, sample data, validation, filtering/sorting, and safe CSV
  data/dashboard-backup.ts           # Backup file size, BOM support, and snapshot validation
  routes/__root.tsx                  # SSR HTML shell, session, theme initialization, and shared states
  routes/_dashboard.tsx              # Protected pathless layout
  routes/_dashboard.index.tsx        # Dashboard overview
  routes/_dashboard.users.tsx        # User management
  routes/_dashboard.settings.tsx     # Workspace settings
  routes/_dashboard.about.tsx        # Template guide
  routes/login.tsx                   # Login page
  server/auth.ts                    # Authentication Server Functions, input validation, and redirect allowlist
  server/session.server.ts          # Server-side account adapter and cookie session configuration
  styles.css                        # Tailwind and light/dark visual tokens
  routeTree.gen.ts                  # Generated by the Router plugin; do not edit manually
```

Add pages through file routes in `src/routes/`. Pages that require login can use the `_dashboard.*` naming pattern to inherit the shared layout and authentication guard. Use TanStack Router's `Link` for internal navigation. The root layout reads the server-side session so SSR and the initial client render receive the same authentication state. Browser data snapshots are restored in an effect to prevent hydration mismatches.

`src/components/Select.tsx` provides a shared dropdown with `compact` and `field` variants. Use `id` to associate a visible label and `name` to include its value in `FormData`. It supports disabled states, keyboard and touch selection, and the current light/dark theme. Menus use the browser popover layer to stay visible outside scrolling dialogs, follow their trigger while scrolling, and open upwards when needed.

Demo storage includes a version and runtime validation. If the browser rejects storage access, edits still work on the current page and a message explains that they may be lost after a refresh. Invalid stored data falls back to the seed data. CSV exports include a UTF-8 BOM and escape quotes and formula prefixes that spreadsheet applications could otherwise execute.

## Charts

Dashboard charts use [Recharts](https://recharts.github.io/) 3.10.1 with React components. The matching `react-is` 19.3.0 peer dependency is installed alongside React 19.3.0.

`src/components/DashboardCharts.tsx` provides `RevenueChart`, `UserStatusChart`, and `MetricSparkline`. The overview passes date/revenue records and current member counts into these components. The revenue chart supports date and currency tooltips, keyboard navigation, and the existing 7/30/90-day selection. The status donut displays all three member statuses and handles an empty workspace. Revenue data remains a fixed sample report, and the other metric sparklines remain decorative sample trends.

Charts use the existing CSS theme tokens for blue accents, axes, grid lines, and tooltips. Containers reserve their dimensions during SSR; responsive charts mount after hydration to avoid server/client layout differences. Chart animations are disabled. The revenue data table and CSV export remain available alongside the interactive chart.

To connect real reporting data, replace the overview's sample series with API or Server Function results and keep the `{ date, revenue }` input shape.

## Connecting real services

1. **Authentication and authorization**: Replace the account adapter in `session.server.ts` with an identity service, database, or existing authentication system. Preserve input validation, cookie attributes, and safe return URLs. Add session revocation, invitations, password resets, rate limiting, and the required audit logging.
2. **Data access**: Replace initialization and write methods in `DashboardProvider` with Server Functions or API calls. Every private endpoint must verify identity and permissions on the server; hiding action buttons in the UI does not replace server-side authorization. Add server-side search, pagination, and caching as the user base grows.
3. **Reports and notifications**: Replace the fixed overview revenue data with real aggregate queries. Connect demo notifications and notification preferences to a messaging or email service.
4. **Deployment**: Choose an SSR host or deployment adapter compatible with the current TanStack Start version, and inject runtime configuration. Set up HTTPS, logging, error monitoring, and CI. Uploading only `dist/*/client` is insufficient because authentication Server Functions require a server. Use `vite preview` only for local validation. See the [TanStack Start hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) and [authentication guide](https://tanstack.com/start/latest/docs/framework/react/guide/authentication).

### Remaining functionality and priorities

The current project is an interactive demo template. The following work is still needed for a shared business application:

| Priority | Missing capability                  | What needs to be connected                                                                                                                                                                    |
| -------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Shared, durable data                | Database and server-side member/settings read and write operations, server validation and authorization, and migration/backup strategy. `VITE_API_BASE_URL` alone does not provide these.     |
| P0       | Real identity and account lifecycle | Identity provider, account/member mapping, invitations, password recovery, session revocation, and login rate limiting.                                                                       |
| P1       | Concurrent editing                  | Server record versions or another conflict policy. Browser demo snapshots still use last-write-wins across simultaneous writes; settings draft warnings do not provide transaction isolation. |
| P1       | Real reports and notifications      | Aggregate business queries, actual invitation delivery, notifications, and delivery preferences. Current revenue series and welcome notification are samples.                                 |
| P1       | Operations and release checks       | Audit trail, error monitoring, CI checks, an SSR deployment adapter, and verification of runtime secrets and HTTPS on the chosen host.                                                        |
| P2       | Larger member workflows             | Bulk operations and import/merge policies once a backend and product rules are defined. JSON recovery currently replaces a full snapshot; it is not a CSV member import workflow.             |

## Validation commands

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm format
```

`pnpm check` writes formatted files and runs ESLint with automatic fixes. Tests use a separate `vitest.config.ts` and cover domain validation, URL state, storage versions, CSV safety, Provider permissions and storage fallbacks, backup validation and confirmation flows, settings draft conflicts and navigation protection, and environment parsing. The Start build plugin is excluded from unit tests.

Keep the dependency lockfile in version control and prefer `--frozen-lockfile` when installing. TanStack routing packages are pinned to compatible versions. The explicit Router Core dependency prevents devtools from automatically selecting an incompatible peer. `pnpm-workspace.yaml` allows installation scripts only for the required native dependencies.

## License

This project is licensed under the [MIT License](LICENSE).
