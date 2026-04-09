# Customer Support System

Pet products after-sales service website (MVP) for US users, with bilingual support (English/Chinese).

## Project Goals

- Product showcase only (no purchase flow)
- After-sales request submission and tracking
- Internal ticket processing for support team
- Bilingual content and interface (EN / zh-CN)

## Repository Structure

```text
customer-support-system/
  apps/
    web/                    # Public website (showcase + after-sales submit + ticket query)
    admin/                  # Internal support console
    api/                    # Backend APIs and business logic
  packages/
    ui/                     # Shared UI components
    types/                  # Shared TypeScript types and API contracts
    i18n/                   # Translation keys and locale resources
    config/                 # Shared lint/build/runtime config
  docs/
    requirements/           # PRD, scope, acceptance criteria
    prototype/              # Wireframes, flow notes, UX decisions
    planning/               # Development plans, milestones
    architecture/           # System design, data flow, integration notes
    api/                    # API specs (OpenAPI or endpoint docs)
    adr/                    # Architecture Decision Records
    maintenance/            # Runbooks, release notes, checklists
  tests/
    e2e/                    # End-to-end tests
    api/                    # API integration tests
  infra/
    docker/                 # Docker-related files
    deploy/                 # Deployment config/templates
    scripts/                # CI/CD or maintenance scripts
```

## Suggested Delivery Phases (MVP First)

1. Finalize PRD and acceptance criteria in `docs/requirements/`
2. Complete low-fidelity prototype in `docs/prototype/`
3. Implement `apps/api` core ticket workflow
4. Implement `apps/web` public pages and bilingual support
5. Implement `apps/admin` ticket management basics
6. Add test coverage in `tests/` and release checklist in `docs/maintenance/`

## Quick Start

Install dependencies once:

```bash
npm install
npm install --prefix apps/api
npm install --prefix apps/web
npm install --prefix apps/admin
```

Start local dependencies and all apps together:

```bash
npm run dev
```

If Docker dependencies are already running (or you only want to run apps):

```bash
npm run dev:apps
```

Default local ports:
- API: `http://localhost:3001`
- Prisma Studio: `http://localhost:5555`
- Web/Admin dev servers: Vite default ports (`5173`/next available)

Stop local Docker dependencies:

```bash
npm run dev:stop
```

## Documentation

- MVP development plan: [`docs/planning/mvp-development-plan.md`](docs/planning/mvp-development-plan.md)
- Technical architecture (React + Ant Design + NestJS): [`docs/architecture/tech-architecture-react-antd-nestjs.md`](docs/architecture/tech-architecture-react-antd-nestjs.md)
- MVP database design and table relationships: [`docs/database/mvp-database-design.md`](docs/database/mvp-database-design.md)
- Notion MCP in Cursor: [`docs/maintenance/notion-cursor-setup.md`](docs/maintenance/notion-cursor-setup.md)
