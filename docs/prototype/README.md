# Prototype Planning Guide (MVP)

## Purpose

Use this folder to keep product prototype assets and decisions synchronized with implementation.

## Recommended Artifacts

- `site-map.md`: page inventory and navigation structure
- `user-flows.md`: end-to-end flows (submit ticket, query ticket, admin handling)
- `wireframes/`: low-fidelity wireframes (PNG/PDF/Figma export)
- `copy-decision-log.md`: important copy and bilingual terminology decisions

## Minimum Prototype Coverage for This Project

1. Public pages:
   - Home
   - Product list
   - Product detail
   - After-sales form
   - Ticket query
2. Admin pages:
   - Ticket list
   - Ticket detail
3. Shared states:
   - Empty, loading, error, success
   - Bilingual switch behavior

## Handoff Rules

- Every wireframe should include:
  - page name
  - primary goal
  - key components
  - states and edge cases
- Keep component names aligned with `packages/ui`
- Keep labels aligned with `packages/i18n` keys

