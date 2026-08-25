# ERP Administration Foundation

Administration console for an ERP platform: dashboard, users, roles, branches and role
permissions. Built as the foundation for later business modules, so new modules are added
by extending the existing layers rather than restructuring them.

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js 16 (App Router) with React 19           |
| Language   | TypeScript, strict                              |
| Styling    | Tailwind CSS 4 with semantic design tokens      |
| UI         | Radix primitives, vendored into `components/ui` |
| Database   | PostgreSQL with Prisma 7 (`pg` driver adapter)  |
| Passwords  | Argon2id via `@node-rs/argon2`                  |
| Auth       | HMAC-signed session cookies, Argon2id passwords |
| Validation | Zod, shared by client and server                |
| Forms      | React Hook Form                                 |
| Testing    | Vitest with Testing Library                     |

## Getting started

Requires Node 20.11 or newer and PostgreSQL 16 or newer — either a local install or the
bundled `docker compose up -d`.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the blank values
npm run db:migrate          # create the schema
npm run db:seed             # organization, branch, roles, permissions (no users)
npm run dev
```

`AUTH_SECRET` must be at least 32 characters:

```bash
openssl rand -base64 32
```

The application refuses to start if any required environment variable is missing or
malformed, and reports every problem at once. See `.env.example` for the full list.

Sign in with a user that already exists in the database. Seed never creates or
resets accounts. Verify a credential without a browser:

```bash
npm run db:verify -- existing-user@example.com 'the-password'
```

## Scripts

| Command             | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Development server                         |
| `npm run build`     | Production build                           |
| `npm run typecheck` | TypeScript, no emit                        |
| `npm run lint`      | ESLint, including architectural boundaries |
| `npm run test`      | Vitest suite                               |
| `npm run check`     | Typecheck, lint and test together          |
| `npm run format`    | Prettier                                   |

### Database

| Command               | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `npm run db:migrate`  | Create and apply a migration in development         |
| `npm run db:deploy`   | Apply pending migrations (production)               |
| `npm run db:status`   | Show migration state                                |
| `npm run db:seed`     | Idempotent catalog seed (no user accounts)          |
| `npm run db:reset`    | Drop, re-migrate and re-seed — destroys all data    |
| `npm run db:studio`   | Prisma Studio                                       |
| `npm run db:generate` | Regenerate the client after editing `schema.prisma` |
| `npm run db:verify`   | Check an email and password against the database    |

## Architecture

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). The short version:

```
Route (server component)
  → Feature component
    → Server action        ← authentication, authorization, validation, error mapping
      → Service            ← business rules, transactions, audit
        → Repository       ← the only layer that imports Prisma
          → PostgreSQL
```

Two rules matter more than the rest, and both are enforced by ESLint rather than
convention:

- Only `src/repositories/**` may import the Prisma client.
- Components may not import services, repositories or the server environment.

Authorization is resolved from the database on every request and is never carried in the
session cookie, so deactivating a user or changing a role's permissions takes effect
immediately. Hidden buttons are a convenience; the server action is the boundary.

## Project layout

```
src/
├── app/              routes: (auth), (dashboard), api
├── components/       ui, layout, forms, tables, dashboard, shared
├── features/         per-module components, server actions and types
├── services/         business rules, transactions, audit
├── repositories/     database access
├── validations/      Zod schemas shared by client and server
├── lib/              action wrapper, authorization, errors, logging, pagination
├── constants/        permissions, navigation, routes, statuses, messages
├── hooks/  types/  utils/  config/
└── proxy.ts          cookie-presence redirect only, not a security boundary
prisma/               schema.prisma, migrations, seed.ts
generated/prisma/     Prisma client output — generated, not committed
scripts/              operational CLI scripts
tests/                unit, component, fixtures, helpers
```

## Development phases

| Phase | Scope                                     | Status   |
| ----- | ----------------------------------------- | -------- |
| 1     | Project setup and architecture            | Complete |
| 2     | Database schema, migrations and seed      | Complete |
| 3     | Authentication and session management     | Complete |
| 4     | RBAC foundation and permission catalog    | Complete |
| 5     | Branch management                         | Complete |
| 6     | Role management                           | Complete |
| 7     | Role permission management                | Complete |
| 8     | User management                           | Complete |
| 9     | Dashboard                                 | Complete |
| 10    | Security hardening, testing, optimization | Complete |

Client components hide controls with `<Can>`; the matching server action remains the
authorization boundary.

## Security notes

- No credentials, connection strings or secrets in source control; `.env` is ignored and
  only `.env.example` is committed.
- Security headers, including a per-request nonce Content-Security-Policy, are set
  in `src/proxy.ts` and `next.config.ts`. Authenticated HTML is `Cache-Control: no-store`.
- Passwords are hashed, never stored or logged in plain text; the logger redacts
  credential-shaped keys recursively.
- Errors shown to users are sanitized. Stack traces, SQL and Prisma internals stay in the
  server log.
