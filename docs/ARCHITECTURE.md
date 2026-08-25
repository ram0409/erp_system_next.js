# Architecture

This document records the decisions that later phases depend on, and the reasoning behind
them. If a decision here is reversed, expect to touch several modules.

## Layering

```
Route (RSC page)  →  Feature component  →  Server action
                                                │
                                    ┌───────────┴───────────┐
                                    │  defineAction wrapper │  authn → authz → validation
                                    └───────────┬───────────┘
                                                ↓
                                          Service layer          business rules, transactions, audit
                                                ↓
                                        Repository layer          the only Prisma consumer
                                                ↓
                                          PostgreSQL
```

Each layer may call only the layer below it. Two boundaries are enforced by ESLint
(`eslint.config.mjs`) because a rule that lives only in a document stops being true within
a few sprints:

- `@prisma/client` and `@/lib/prisma` may only be imported from `src/repositories/**`.
- Components may not import `@/services/*`, `@/repositories/*` or `@/config/env`.
- Services and repositories may not import React, Next navigation, components or features,
  which keeps them unit-testable without a rendering environment.

Services never read cookies or headers. They receive an explicit `ActorContext`, which
makes audit attribution reliable and lets tests construct an actor directly.

## Authorization

The most important decision in the codebase: **permissions are never carried in the session
cookie.** The cookie holds a user identifier and a `tokenVersion`, nothing more.

On each request, `getActorContext()` resolves the actor's live state — user, status, role
and granted permissions — in a single indexed query, wrapped in React's `cache` so the
layout, the page and any action in that request share one read.

This buys three properties:

- **Immediate revocation.** Deactivating a user or changing their role applies on their next
  request. Bumping `tokenVersion` invalidates every cookie already issued to them.
- **No stale permissions.** Editing a role's matrix affects every holder of that role at once.
- **No trusted client input.** The UI hides controls using the same permission set, but the
  server re-checks before any service method runs.

Super Admin is a seeded role carrying `isSuperAdmin`, and `hasPermission` short-circuits to
allow for it. Future ERP modules are therefore covered by the administrator role on the day
they ship, with no permission backfill — while every other role stays strictly
database-driven.

### Sessions

The session is a compact HMAC-SHA256 cookie (`userPublicId`, `tokenVersion`, expiry), not a
JWT and not Auth.js. The algorithm is fixed in code so a client cannot advertise `alg: none`.
Lifetime is `SESSION_MAX_AGE_SECONDS` (eight hours by default). Password change and password
reset increment `tokenVersion`, which invalidates every cookie issued under the old value.
The current change-password request is re-issued a cookie; a reset requires a fresh sign-in.

`src/proxy.ts` only checks that a cookie _exists_. It does not bounce cookie-holders off
`/login`: an expired or revoked cookie must be able to reach the form, or the dashboard
layout's redirect to login and a cookie-based bounce form an infinite loop.

### Password reset

Tokens are 32 random bytes, stored as SHA-256. The plaintext is emailed (or logged in
development when SMTP is unset). Unknown and inactive addresses receive the same success
message as a real account. Redeeming a token is single-use, enforces the password policy,
refuses reuse of the current password, and does not auto-login.

### Where checks live

| Layer                | Responsibility                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| `proxy.ts`           | Redirects visitors with no session cookie. **Not** a security boundary |
| `(dashboard)` layout | Redirects to sign-in when no actor resolves                            |
| Page                 | `requirePageAccess(permission)`; renders the denial state on failure   |
| Server action        | `defineAction({ permission })`; the authoritative check                |
| Service              | Business invariants, e.g. cannot deactivate the last Super Admin       |
| `<Can>` / `useCan`   | Hides controls in client UI. **Not** a security boundary               |

`proxy.ts` runs before a request reaches a server component and has no database access, so
it can only observe that a cookie exists. Treating that as authorization is a well-known
source of auth bypasses, which is why every page and action checks independently.

Hiding a button in the browser uses the same permission set, via `<Can>` and `useCan`,
fed by a snapshot the dashboard layout provides. That snapshot is not a grant: it is a
hint for the interface. Removing `<Can>` must never make a mutation succeed.

## Error handling

`AppError` subclasses carry a message that is safe to show a user plus an `internalDetail`
that never leaves the server. The action wrapper converts anything thrown into:

```json
{ "success": false, "message": "…", "errors": [], "code": "…" }
```

Unrecognized errors become a generic message and a logged entry, so SQL text, Prisma
internals, file paths and stack traces cannot reach a browser. Validation failures carry
per-field errors so forms can highlight the offending input.

Order inside the wrapper is authenticate, then authorize, then validate. Validating first
would let an anonymous caller probe the shape of internal schemas.

## Data model conventions

- **Dual identifiers.** Compact `Int` primary keys for joins; a `publicId` (cuid2) in URLs
  and payloads, so sequential ids are never exposed and record counts cannot be inferred.
- **Explicit soft delete.** `deletedAt` on `Branch` and `User`, filtered by a repository
  helper rather than a Prisma client extension. Implicit global query rewriting is exactly
  the kind of magic that causes a silent data leak when someone later writes a raw
  aggregate.
- **Integrity at the database.** `User.branchId` and `User.roleId` are `Restrict`, so a
  branch with assigned users cannot be deleted even by a buggy service.
- **Permissions as rows.** `Permission` has a unique `(module, action)`. Adding a module is
  a seed insert plus a constants entry, with no migration to existing tables.
- **Case-insensitive uniqueness.** Email, branch code and role name are stored with
  normalized lowercase companions and unique indexes; uniqueness that is case-sensitive is
  not real uniqueness for these fields.
- **Audit logs store diffs, never secrets.** Values pass through a redaction allowlist, so
  password hashes and tokens cannot be serialized into an audit row.
- **Login attempts are a separate table.** Per-account lockout lives on `User`; IP-wide
  throttling and forensic review use `login_attempts`, which records misses as well as
  hits and never stores a password.

## The permission catalog

`src/constants/permissions.ts` is the single source of truth. The database seed is generated
from `PERMISSION_CATALOG`, guards reference `PERMISSIONS.USERS.CREATE`, and the Role
Permission matrix renders from the same catalog. A test asserts the flattened catalog and
the typed constants agree, because a divergence would mean a guard checking a permission no
role can hold.

## Table and listing contract

Every listing page shares one contract, defined in `src/lib/pagination.ts`:

- Page size is clamped server-side to `MAX_PAGE_SIZE`; without that, `?pageSize=1000000`
  would let any authenticated user pull an entire table in one request.
- Sort fields are resolved against a per-table allowlist, so a query parameter can never
  reference an arbitrary or sensitive column.
- Table state lives in the URL, which makes filtered views bookmarkable and lets the server
  component re-render with fresh data instead of the browser holding a second copy.

## Styling

Semantic tokens in `globals.css` (`--color-surface`, `--color-muted`, `--color-border`, the
`sidebar-*` family) rather than raw colours in components, so density and palette change in
one file and a dark theme can be added without touching component code. Motion is
functional only — it signals that a surface opened or closed — and is disabled under
`prefers-reduced-motion`.

Dates are formatted with a fixed locale and time zone. Inferring either from the runtime
would produce different text on server and client and trigger a hydration mismatch.

## The database layer

Prisma 7 no longer accepts a connection string on the client: a driver adapter is
mandatory, so `src/lib/prisma.ts` owns the `pg` pool and is the only module that
constructs a client. The pool and client are cached on `globalThis` in development
because every hot reload re-evaluates the module, and without the cache each reload
would open another pool until PostgreSQL started refusing connections.

The generated client lives in `generated/prisma` (outside `src/`, git-ignored,
recreated by `postinstall`). Keeping it out of `src/` means the lint boundaries and
test globs never have to special-case a directory of machine-written code.

`src/repositories/prisma-errors.ts` translates driver failures into the application
error hierarchy. This matters because a raw Prisma error embeds the failing SQL and
sometimes parameter values, so returning one to a browser leaks schema detail. Unique
violations are mapped back to the form field that caused them — the index rejects
`email_normalized`, but the form needs to highlight `email`.

## Passwords

Argon2id with parameters stated explicitly (m=19 MiB, t=2, p=1, per the OWASP
recommendation) rather than left to library defaults, so an upstream default change
cannot silently weaken every hash written afterwards. `needsRehash` compares a stored
hash against the current parameters, which lets the sign-in path transparently upgrade
older hashes once these values are raised.

`verifyPassword` returns `false` for a malformed stored hash instead of throwing: a
corrupt row must fail the sign-in rather than produce a 500 that confirms the account
exists.

## Seeding

The seed is idempotent — every write is an upsert on a stable natural key — with one
deliberate exception: an existing user's password is never overwritten. A seed that
reset live credentials on every deploy would be a far worse failure than a seed that
declines to change one. Permission rows are generated from `PERMISSION_CATALOG`, so
adding an ERP module is a constants edit plus a re-seed rather than a migration.

## Content Security Policy

HTML responses get a fresh nonce from `src/proxy.ts`. Next.js reads that nonce and
stamps it onto framework scripts, which is what lets production `script-src` drop
`'unsafe-inline'`. `style-src` keeps `'unsafe-inline'`: a nonce on that directive
would ignore the keyword, and Radix still positions overlays with inline styles.

JSON routes use a separate `default-src 'none'` policy from `next.config.ts`. The
proxy never runs on `/api`, so a page nonce is not mixed into health checks.

## Deliberate omissions

- **`exactOptionalPropertyTypes`** is off. It is correct in principle, but with React Hook
  Form and Radix prop spreading it produces frequent friction with little safety gain here.
  `noUncheckedIndexedAccess` is on, which catches the class of bug that actually occurs.
- **No global client state library.** Server components own server state and table state
  lives in the URL, so there is nothing left for Zustand to hold. It will be introduced only
  if a genuine cross-component client concern appears.
- **`createdBy` / `updatedBy` columns** are absent. Attribution lives in `AuditLog`, which
  avoids circular foreign keys between `User` and the masters that `User` itself points at.
- **An npm `overrides` entry pins `deepmerge-ts` to 8.x.** GHSA-ggr8-5vv4-36mx is a stack
  exhaustion reachable only through the dev-only Prisma CLI config loader, and npm's
  suggested remedy was a major downgrade to Prisma 6. The override keeps `npm audit` clean
  without that; remove it once `@prisma/config` depends on 8.x itself.
