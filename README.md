# Mattel Infrastructures

Operations platform for construction ledgers, inventory, asset rentals, weekly wages, subcontracts, and resort billing.

The specification lives in:

- `system.md` — stack, CI/CD, and PostgreSQL schema
- `design.md` — visual system and the split-screen invoice studio
- `project_report.md` — module scope
- `.dev_suite/logs/AI_CHANGE_LOG.md` — append-only change log
- `.dev_suite/catalog/FUNCTION_CATALOG.md` — functions, routes, and components

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` before connecting PostgreSQL or S3-compatible storage. Generate migrations with `npm run db:generate`.
