# LMS 2.0 prototype

Internal prototype (React + Vite + Tailwind + Motion + Recharts + Zustand). Style: same clay / Wing-green look as the NBO prototype (see design-brief.md).

- `npm run dev` start, `npm run build` type-check + build, `npx vite build --mode preview` single-file `dist/index.html` to share.
- Pages: Dashboard (default), Product configuration, Pre-select (selection + knock-out rules), User management (users, roles, permission matrix).
- Mock user roles: use "Viewing as" in the top bar to see sidebar and buttons change per role.
- All data is synthetic and lives in memory (reset with the circular arrow in the top bar). Sidebar: toggle button or Ctrl/Cmd+B.
