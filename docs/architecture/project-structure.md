# Project Structure and Maintenance Strategy

## Design Principles

- Separate business apps by responsibility (`web`, `admin`, `api`)
- Centralize reusable code in `packages/`
- Keep product/process docs in `docs/`
- Isolate deployment and environment concerns in `infra/`
- Keep test suites independent and runnable in CI

## Directory Responsibilities

### `apps/web`
- Public customer-facing site
- Product showcase, after-sales submission, ticket query
- i18n rendering with EN/zh-CN support

### `apps/admin`
- Internal support console
- Ticket lifecycle management and response updates

### `apps/api`
- Ticket domain logic
- Product read APIs
- Upload and notification orchestration

### `packages/ui`
- Shared design system components used by `web` and `admin`

### `packages/types`
- Shared domain and API contracts
- Keeps frontend and backend in sync

### `packages/i18n`
- Translation dictionary and key naming rules
- Locale files for `en-US` and `zh-CN`

### `docs/*`
- Product, UX, architecture, API, operation documents, and development plans (`docs/planning/`)

### `tests/*`
- `tests/api`: integration and contract tests
- `tests/e2e`: key user journeys

### `infra/*`
- Containerization, deployment templates, and operational scripts

## Suggested Naming Conventions

- Branches: `feat/<scope>-<short-desc>` (example: `feat/ticket-submit-form`)
- Docs: kebab-case file names
- i18n keys: `domain.page.section.key` (example: `ticket.form.label.email`)

## Maintenance Rules

1. Any feature must include:
   - requirement update (`docs/requirements/`)
   - API change note (`docs/api/`) when applicable
   - test update in `tests/`
2. Keep shared contracts in `packages/types` first, then consume in apps
3. Add ADR record under `docs/adr/` for major architecture decisions
4. Keep MVP scope guardrails visible in PRD and PR descriptions

