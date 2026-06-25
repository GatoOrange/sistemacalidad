# AGENTS.md — sistema calidad

## Stack

React 19 + React Router DOM 7 + Vite 7 + Tailwind CSS 4 + shadcn/ui (New York, lucide icons) + Express 4.

Package manager: npm. No test framework.

## Commands

```bash
npm run dev      # Vite dev server (hot-reload)
npm run build    # Production build to dist/
npm start        # Express server on :3000 serving dist/ (requires build first)
npm run preview  # Vite preview server
npm run lint     # ESLint (flat config) — includes Prettier formatting errors
npm run format   # Prettier --write . (ignores node_modules, dist, .output, .vinxi)
```

**Production order:** `npm run build` → `npm start`.

## Entrypoints & key files

| File                     | Purpose                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `src/main.tsx`           | App bootstrap: wraps `App` in `ErrorBoundary` + `StrictMode`                |
| `src/App.tsx`            | React Router: `/` → `routes/index.tsx`, `*` → 404                           |
| `src/routes/index.tsx`   | **Single ~2400‑line file** containing all UI, logic, and PDF generation     |
| `server.js`              | Express static server, serves `dist/` on `process.env.PORT \|\| 3000`       |
| `src/styles.css`         | Tailwind v4 CSS‑first config (`@theme inline`), dark mode via `.dark` class |
| `src/lib/predictions.ts` | Prediction engine: heuristic estimates based on process variables           |
| `src/lib/utils.ts`       | `cn()` utility (`clsx` + `tailwind-merge`)                                  |
| `components.json`        | shadcn/ui config (`@/` alias, CSS variables, New York style)                |
| `public/fonts/`          | Calibri TTF files for PDF generation (jsPDF + jspdf-autotable)              |

## Important quirks

### 🐛 Positional bug in generatePredictions call

`src/routes/index.tsx:852` calls `generatePredictions` with **11 arguments** but the function in `src/lib/predictions.ts:40` only accepts **10**. The extra arg (`p.conversion`) is silently ignored. Worse, the positional mapping is wrong — values flow into different parameters than intended:

| Call arg | Variable passed    | Parameter received as | Effect                                                      |
| -------- | ------------------ | --------------------- | ----------------------------------------------------------- |
| 6        | `p.relacionMolar`  | `catNombre`           | "1:6" won't match NaOH/KOH/CH₃ONa → defaults to 0.90 factor |
| 7        | `p.temperatura`    | `relacionMolar`       | Numeric string like "65" → parsed as molar ratio            |
| 8        | `p.tiempoReaccion` | `temperatura`         | Minutes string → used as °C                                 |
| 9        | `p.agitacion`      | `tiempoReaccion`      | RPM string → used as minutes                                |
| 10       | `p.rendimiento`    | `agitacion`           | Yield % → used as RPM                                       |
| 11       | `p.conversion`     | (ignored)             | —                                                           |

The function produces plausible-looking results despite this because all values happen to be nonzero numeric strings, but predictions are technically wrong.

### Tailwind v4

No `tailwind.config.*` file. All theme tokens are defined in `src/styles.css` via `@theme inline { … }`. Colors use oklch. The `@import "tailwindcss" source(none)` + explicit `@source "../src"` is non‑standard.

### TypeScript config

- `verbatimModuleSyntax: false` — do NOT use `import type` / `export type`
- `noUnusedLocals` / `noUnusedParameters`: `false` — unused vars are fine
- Path alias `@/` → `src/` (via `vite-tsconfig-paths` + tsconfig `paths`)

### ESLint

Flat config (9.x), TypeScript‑ESLint. `@typescript-eslint/no-unused-vars` is **off**. Import order and formatting are enforced by `eslint-plugin-prettier/recommended` (error level).

## Architecture notes

- **Single‑page dashboard** — no code splitting, no lazy routes. All 8 views live in one component with `Tabs` + `TabsContent` from shadcn/ui.
- **3 input steps** (materia, reactivos, proceso) → stepper navigation with progress tracking. **5 output tabs** (analisis, predicciones, comparacion, mercado, informe) enabled after any input step is completed.
- **"Datos aleatorios"** button (`Shuffle` icon in header) fills all fields with realistic random data from predefined oil profiles.
- **PDF generation** uses jsPDF + local Calibri fonts from `public/fonts/`. Falls back to Helvetica if font loading fails.
- **Dark mode** defaults to `true`, toggled via header sun/moon button, persisted via `.dark` class on `<html>`.
- **Animated background** via `MoleculeBackground.tsx` (fixed z‑0, decorative only).
- **Recharts** for bar charts (predicciones vs biodiesel) and radar chart (technical profile on the analisis tab).

## Dashboard display names vs internal tab values

| Display name            | Tab value      |
| ----------------------- | -------------- |
| Materia prima           | `materia`      |
| Reactivos               | `reactivos`    |
| Proceso                 | `proceso`      |
| Análisis                | `analisis`     |
| Predicciones            | `predicciones` |
| Viabilidad y Estrategia | `comparacion`  |
| Mercado                 | `mercado`      |
| Informe                 | `informe`      |
