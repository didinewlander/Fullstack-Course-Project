# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Do-Hook-In** — a full-stack inventory/logistics management app connecting three roles: **Logistics Manager**, **Vendor**, and **Supplier**, built for an Advanced Full-Stack course (dual curriculum with Logistics Management). Core domain: products/inventory (EOQ-based restock), orders (with an auto-price calculation covering base price, shipping, storage, customs, VAT), deliveries, notifications, and invoicing. Order lifecycle: `Pending → Approved → In Transit → Arriving Soon → Delivered → Billed`. See root `README.md` for the full feature breakdown by role, and `backend/README.md` / `frontend/README.md` (in Hebrew) for the feature-by-feature build plan.

This is a monorepo with two independent apps: `backend/` (Express + MongoDB API) and `frontend/` (React SPA), each with their own `package.json`.

## Commands

Backend (`backend/`):
- `npm install` — install deps
- No dev/start script exists yet in `backend/package.json` — `server.js` is currently an empty stub. When adding one, follow the existing dependency choices already installed (`express`, `mongoose`, `jsonwebtoken`, `bcrypt`, `multer`, `helmet`, `express-rate-limit`, `dotenv`).
- No test framework is configured (`npm test` is the default CRA placeholder that exits with an error).

Frontend (`frontend/`):
- `npm install` — install deps
- `npm run dev` — start Vite dev server
- `npm run build` — production build (outputs to `frontend/dist`)
- `npm run preview` — preview the production build
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- No test framework is configured yet.

## Architecture

### Backend status
The backend is currently an empty skeleton — `server.js` has no content, and there are no routes/models/controllers yet. A prior PR (#31, "backend initial setup") was merged and then reverted (PR #32), so don't assume anything beyond `package.json` dependencies is in place. Env vars are documented in `backend/.env.example`: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`.

### Feature development is issue-driven
Features are built one GitHub issue at a time, and code comments frequently reference the issue that introduced them or the issue a `TODO` is blocked on (e.g. `// issue #7`, `// TODO: once issue #10 (backend) + #9 (axios) are ready`). When picking up work, check for these references in nearby code — they indicate real sequencing dependencies (e.g. real API calls are blocked on backend issues, Redux wiring is blocked on other issues) rather than arbitrary tech debt.

### Frontend auth is currently fake, by design
`frontend/src/context/AuthContext.jsx` implements a **fake, localStorage-based** login/register (no password check, no server call) so that UI/routing work isn't blocked on the real backend Auth API (issue #5). `login`/`register` return a fake user object with a `role`, persisted under the `doHookIn_user` key. Do not "fix" this into a real API call unless the task is specifically about wiring up real auth — it's an intentional stopgap.

- `frontend/src/context/auth-context.js` — the `createContext` object only (kept separate so ESLint's react-refresh rule doesn't complain about a component file exporting non-components).
- `frontend/src/context/useAuth.js` — the `useAuth()` hook.
- `frontend/src/context/AuthContext.jsx` — the `AuthProvider` with the fake login/register/logout logic.

### Routing and role-based dashboards
`frontend/src/App.jsx` defines all routes. `/login` and `/register` are public; `/dashboard/manager`, `/dashboard/vendor`, `/dashboard/supplier` are wrapped in `ProtectedRoute` (redirects to `/login` if no user in `AuthContext`). `frontend/src/utils/roleRoutes.js` (`getDashboardPathByRole`) is the single source of truth mapping a user's `role` string (`manager` | `vendor` | `supplier`) to its dashboard path — used by both Login and Register after a successful auth action so the mapping isn't duplicated. Manager and Supplier currently render the same generic placeholder `Dashboard` component with a different `title` prop; Vendor has its own real page (`ProductCatalog`).

### State management split: Redux vs Context
- **Redux** (`frontend/src/redux/`) holds shared *domain* data — currently just `productsSlice` (product list + catalog search text). `store.js` composes slices; more (orders, notifications) are expected to be added the same way as those features land.
- **Context** (`AuthContext`) holds the *current user/session*, not domain data — kept separate from Redux intentionally.
- Product data is mock data (`frontend/src/data/mockProducts.js`) loaded straight into Redux initial state; it's expected to be replaced by a `createAsyncThunk` API call once the backend products endpoint and an Axios API layer exist.

### Styling
Tailwind CSS v4 (via `@tailwindcss/vite` plugin) is a dependency, but existing pages (`Login`, `Register`, `ProductCatalog`) currently use plain hand-written CSS files (`Auth.css`, `ProductCatalog.css`) rather than Tailwind utility classes — check which convention a given page already follows before introducing the other.
