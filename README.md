# Recomp 83

**Live: https://jeremyspm.github.io/recomp-83/**

A mobile-first tracker for a 20–26 week body-recomposition protocol (114 kg → 83 kg).
It covers the projection engine, the two nutrition modes with macro cycling, and the
35-minute machine-only workout logger. It runs as a static site with no backend: all
data lives in the browser's `localStorage`, with JSON export and import in Settings.

**Read [PLAN.md](PLAN.md) first.** It is the audited build prompt: every number from
the original brief that was corrected, every claim that was reworded, and why, with
references.

## On a phone

Open the live link, then **iPhone:** Safari → Share → Add to Home Screen; **Android:**
browser menu ⋮ → Install app. It opens full screen, with its own icon, and works with no
signal. `public/sw.js` caches the app on first load: page loads go network-first, and the
content-hashed assets come from the cache. A dismissible card on the Dashboard says this on
phones that haven't installed it yet.

On iPhone, the home-screen app has its own storage, separate from Safari. Install it before
logging anything, or export from Safari and import into the installed app. The PNG icons in
`public/` (180, 192, 512 and a maskable 512) are rendered from `favicon.svg`'s geometry.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run lint       # ESLint (flat config, typescript-eslint, react-hooks)
npm run audit      # engine checks: the brief's arithmetic, projections, scenarios, backup
```

Node 24 is recommended. Vite 7 needs Node 20.19+. `npm run audit` runs the TypeScript
engine directly through Node's built-in type stripping, which needs Node 22.18+ or 23.6+.

## What's where

| Path | What it is |
|---|---|
| `src/lib/physiology.ts` | Mifflin-St Jeor, adaptive dampening, Forbes partition, Hall energy densities, the weekly projection, water shifts, the crash benchmark |
| `src/lib/nutrition.ts` | Mode 1, Protein+ and Mode 2 targets, refeed macros, meal-timing generator, daily checklist |
| `src/lib/workouts.ts` | Sessions A/B, swap lists, double progression, dip detection, warm-ups |
| `src/lib/model.ts` | Glue: current phase and day type, projection for the settings, trend ETA, model check, alerts |
| `src/lib/storage.ts` / `persist.ts` | Defaults, Day-1 state, validation of imported/saved JSON; localStorage access |
| `src/lib/demo.ts` | The Week-1 demo loaded on first launch |
| `src/views/` | `DashboardView`, `WorkoutLoggerView`, `NutritionCycleView`, `RecompSimulatorView` |
| `scripts/audit.ts` | `npm run audit`. It must print `All checks passed.` |

The engine (`src/lib`, except `persist.ts` and `backup.ts`) is pure TypeScript with no
DOM, so the audit runs exactly the code the app runs.

## Data

- One key: `localStorage["recomp83.v1"]`. If it can't be read, a copy is kept at
  `recomp83.v1.corrupt` and the app starts on the demo.
- **Reset to Day 1** (header) clears all logs and starts today at the profile's start
  weight. It keeps the profile and settings, and offers an export first.
- **Export/Import** (Settings) round-trips the whole state. Imports are validated:
  bad fields are dropped or clamped, and a file of the wrong shape is refused.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: lint, `npm run audit`, build,
and publish `dist/` to GitHub Pages. A failing audit blocks the deploy.
`vite.config.ts` uses `base: './'`, so `dist/` also works from any other static host
or sub-path.

## Not medical advice

The app shows general, evidence-based information and a "see your GP first" check. It
doesn't replace a clinician, and the 1,200 kcal plan in particular should be run with one.
