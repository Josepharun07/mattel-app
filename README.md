# Mattel Infrastructures

Operations platform for one construction company. Records live in PostgreSQL: clients, projects, invoices, inventory, rentals, payroll, subcontracts, resort leases, equipment, employees, and settings. The interface uses the shadcn card system at a 13px root size, a light gray canvas, and a compact navigation rail.

The code is split into three layers. `models/` reads and writes PostgreSQL. `controllers/` are the server actions: each one checks the signed-in role before it runs. `views/` are the screens. `app/` only routes a request to a controller or model and renders a view.

The menus in the app now are the owner and super admin office. An operator or a manager does not see them yet. Those roles get their own menus after this office is finished. The owner and the super admin share the same access, including permanent deletion. The super admin account is created on startup from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Other accounts are added later and assigned a role.

A back arrow sits on every screen. It is available after you have opened another page in the office. Saving, issuing, settling, approving, restoring, and signing out ask you to continue before the change is written.

The specification lives in:

- `system.md` — stack and PostgreSQL schema
- `design.md` — visual system and the invoice studio
- `project_report.md` — module scope
- `.dev_suite/logs/AI_CHANGE_LOG.md` — append-only change log
- `.dev_suite/catalog/FUNCTION_CATALOG.md` — functions, routes, and components

```bash
npm install
npm run db:up
npm run dev
```

Copy `.env.example` to `.env`. `DATABASE_URL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` are required. Company profile and bank details are edited in Settings and stored in `system_settings`. S3 settings stay in the env file.
