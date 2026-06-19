# AGENTS.md — sistema calidad

## Stack

React 19 + React Router DOM + Vite 7 + Tailwind CSS 4 + shadcn/ui + Express (Node.js).

Package manager: npm.

## Commands

```bash
npm run dev      # Vite dev server (hot-reload)
npm run build    # Production build to dist/
npm start        # Express server on :3000 serving dist/
npm run preview  # Vite preview server
npm run lint     # ESLint (flat config)
npm run format   # Prettier
```

No test framework installed.

**Order for production:** `npm run build` → `npm start`.

## Key files

| File                     | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `vite.config.ts`         | Vite + React + Tailwind + tsconfigPaths plugins                            |
| `components.json`        | shadcn/ui config (New York style, `@/` alias, lucide icons, CSS variables) |
| `eslint.config.js`       | Flat ESLint config. `no-unused-vars` is **off**. Ignores `dist`            |
| `server.js`              | Express server, serves `dist/` on `process.env.PORT \|\| 3000`             |
| `src/lib/predictions.ts` | Prediction engine: generates JSON forecasts from process variables         |
| `src/styles.css`         | Corporate green palette, oklch colors, single green primary tone           |
| `public/fonts/`          | Calibri font files (calibri.ttf, calibrib.ttf, calibrii.ttf) for PDF      |

## Dashboard tabs (8)

| Tab                    | Content                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Materia prima          | Oil feedstock inputs (acidity, density, moisture, etc.) — 8 fields                                  |
| Reactivos              | Alcohol and catalyst inputs — 8 fields                                                              |
| Proceso                | Methodology + operational conditions — 10 fields                                                    |
| Análisis               | Ester identification + physical/chemical characterization tables + radar chart                      |
| Predicciones           | Yield/conversion/quality stat cards + bar chart (predicted vs biodiesel) + compliance table (✔/✘)   |
| Viabilidad y Estrategia | Global compat score (semaphore), qualitative 13-property comparison table, strengths/weaknesses, alcohol impact, strategic recommendation |
| Mercado                | Niche cards (hover lift), market score bar chart, recommended niche card                            |
| Informe                | PDF report generation (GC-F-005 style, Calibri 12pt, 3-section narrative)                          |

## Path alias

`@/` → `src/` (via `vite-tsconfig-paths` + tsconfig `paths`).

## Routes (React Router DOM)

- `/` — Dashboard (Plataforma Oleoquímica + Sistema de Predicciones)
- `*` — 404 fallback

Defined in `src/App.tsx`.

## CSS/Tailwind

- `src/styles.css` imports Tailwind with `source(none)` + explicit `@source "../src"`
- Theme: oklch color space, dark mode via `.dark` class and `@custom-variant dark`
- `tw-animate-css` for animations

## Ignores

Prettier and gitignore: `node_modules`, `dist`.

## Conventions

- `"noUnusedLocals": false`, `"noUnusedParameters": false` — unused vars/params are allowed
- React Refresh: `react-refresh/only-export-components` at **warn** level
- Prettier: `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`
- `verbatimModuleSyntax: false` — do not use `import type` / `export type` syntax
