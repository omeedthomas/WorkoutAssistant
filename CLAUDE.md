# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ascent is a client-only React 19 + TypeScript + Vite app that models calisthenics as skill trees, plans each
session from logged history, and optionally syncs progress to the user's own Google Drive. There is no backend.
README.md has the user-facing feature list and the Google Cloud setup steps.

## Commands

Requires Node.js 20.19+.

```bash
npm run dev            # http://localhost:5173 (strictPort)
npm run dev:lan        # also serve on the LAN
npm test               # Vitest, run once
npm run test:watch
npx vitest run src/lib/progression.test.ts      # one file
npx vitest run -t "has no prerequisite cycles"  # one test by name
npm run typecheck      # tsc --noEmit
npm run build          # typecheck + vite build into dist/ (static site, hash routing)
npm run check:videos   # hits YouTube oEmbed to confirm every video exists and allows embedding (needs network)
```

There is no linter. TypeScript is strict with `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`
(type-only imports must use `import type`), so unused code fails the build.

Fake accounts without Google: `VITE_CLOUD_MOCK=true npm run dev` (PowerShell: `$env:VITE_CLOUD_MOCK='true'; npm run dev`).
The mock "Drive" lives in localStorage; set `localStorage['ascent:mock-expired'] = '1'` to simulate expired access (the next tap renews it automatically; `ascent:mock-renewals` counts renewals).
Real sign-in needs `VITE_GOOGLE_CLIENT_ID` in `.env.local` (see `.env.example`); without it the app runs local-only.

## Architecture

### Data: authored trees → flattened catalog
- `src/data/trees/*.ts` hold all exercise content as `TreeDef → TrackDef → StepDef`. Each step implicitly requires
  the previous step in its track; `from` sets the first step's prerequisites and `requires` adds extra ones from
  any tree. Targets come from the helpers in `data/targets.ts`.
- `src/data/index.ts` runs `buildCatalog` once at import time to produce `exercises`, `exerciseById`, `tracks`,
  `trackByKey` and `dependentsOf`. Import catalog data from `src/data`, not from individual tree files.
- A new tree also needs its id in `TreeId` (`types.ts`), an entry in the `trees` array (`index.ts`), an
  `ultimate` skill (the Home skill card tracks progress along the path to it), and a card photo in
  `src/assets/trees/` registered in `data/treeImages.ts` (credit it in the README).
- Weighted exercises (`weighted()` / `weightedEach()` targets) carry `target.addedKg`, the mastery load. They
  progress by load, not reps (`planWeighted` in `progression.ts`), and `generateWorkout` holds them back until
  the user has logged one or made it a goal, since they need equipment.
- Trees have a `kind`: `'skill'` (the eight calisthenics trees plus Breakdance) or `'therapy'` (Shoulder Rehab, Lower Back, Hips,
  Mobility). Home shows them in separate sections, and `generateWorkout` puts therapy exercises in their own
  last block.
- Equipment: `StepDef.equipment` lists the gear an exercise needs (any one will do) and `alternatives` suggests
  exercise ids for people without it. `state.equipment` (`null` = never set, so nothing is filtered) holds what
  the user owns. `lib/equipment.ts` decides access (`ready` / `substitute` via a household stand-in from
  `data/equipment.ts` / `missing`), and `fitEquipment` in `workout.ts` adds setup notes or swaps exercises.
- `src/data/catalog.test.ts` checks the catalog: ids exist, no cycles, a prerequisite is never harder than what it
  unlocks, and every exercise has exactly one entry in `videos.ts`. Run `npm test` after any data change.
  Warm-up/cooldown drills (`drills.ts`) reuse an exercise's video via `exercise`, or have their own entry in
  `drillVideos`; `lib/guided.test.ts` checks every drill has one.
- Daily mobility routines (`data/routines.ts`) are ordered lists of drill ids. Drills with `phase: 'mobility'`
  only appear in routines; routines can also use warm-up/cooldown drills. A finished routine is stored as a
  `WorkoutRecord` with `routine` set (focus `['mobility']`), so it shows in History and counts for the streak,
  but `TodayCard` ignores it when deciding whether today's planned workout is done.
- `scripts/check-videos.mjs` parses `videos.ts` with a regex, so keep each entry on one line in the form
  `'exercise-id': { youtubeId: '...', title: '...', channel: '...' },`.
- **Exercise ids are persisted** (localStorage, JSON exports, Drive files). `sanitizeProgress` silently drops
  unknown ids, so renaming or removing an id discards users' mastery and logs for it.

### Pure logic (`src/lib`)
`graph.ts` (status, ancestors, goal paths), `progression.ts` (`planSession`: the next-session prescription
from history; mastered exercises keep progressing past the target via `planMastered`), `workout.ts`
(`generateWorkout`: `mainCount` exercises split across the chosen areas; each area's list is the goal path, then
current steps with main tracks before variations, one due mastered exercise (`maintenanceFor`) slotted in right
after the first, then lead-ins, then steps a little ahead (`NEXT_UP_GAP`) so every area gets at least
`MIN_PER_AREA`; a test sweeps every tree to hold that; `suggestSplit`), `history.ts` (per-day summaries, streaks,
rep growth, body-weight goal progress), `calories.ts` (MET-based estimates) and `layout.ts` (dagre layout for
React Flow) are pure functions of the catalog plus `ProgressState`. Tests run in Vitest's `node` environment
with no DOM, so logic belongs here or in `state/progress.ts`, not in components, if it needs tests.

**Weights are always stored in kg** (`addedKg` on logs, plans and targets, weigh-ins, the weight goal).
`state.units` (`lb`/`kg`) only changes display and input; convert with `lib/units.ts`. Plans snap loads to
5 lb / 2.5 kg plates (`snapLoad`), and targets display rounded up so hitting the shown number meets them.

### State
- `src/state/progress.ts` holds the single `ProgressState` (`version: 1`), its reducer, and `sanitizeProgress`,
  the one validation gate for anything loaded from localStorage, an imported file or the cloud.
- `ProgressContext.tsx` persists to localStorage key `ascent:progress:v1` and syncs open tabs through the
  `storage` event. Components change progress only through its `useProgress()` API.
- `activeWorkout.ts` stores the started workout separately (`ascent:workout:v1`) as a snapshot for that day, so
  logging sets mid-workout doesn't regenerate it. It also holds the guided player's state (`guided`, `position`).
- Guided workouts: `lib/guided.ts` turns the snapshot (`guidedSteps`) or a mobility routine (`routineSteps`) into
  steps (every set, each side of a per-side timed hold), rest lengths (`restSeconds` in `progression.ts`, also
  used for "Rest …" labels and time estimates) and announcer lines. `components/GuidedPlayer.tsx` is the generic
  player, a small state machine (get-ready → work → rest) on `Date.now()`-based timers; `GuidedWorkout.tsx`
  wraps it to log exercises and tick drills, and `pages/MobilityPage.tsx` to record finished routines. Speech
  goes through `lib/announcer.ts` (`speechSynthesis`, preferring an on-device voice); its on/off and demo-video
  preferences are per device in localStorage (`ascent:guide`), not synced.
- Days are local calendar days (`localDay()`, `YYYY-MM-DD`), not UTC. Logs, workouts and weigh-ins are filed by
  them; do date arithmetic on them with `addDays` / `daysBetween` from `lib/history.ts`.
- Signing out clears this device's progress and the started workout (`clearActiveWorkout`), since both belong
  to the account. Home starts a workout without the Workout page mounted by writing the snapshot
  (`saveActiveWorkout`); the Workout page picks it up when it opens.
- Streak timing lives in `lib/history.ts` (`streakOf`, `streakDeadline`, `streakUrgency`, `REMINDER_HOURS`).
  `StreakReminder` (mounted once in `App.tsx`) shows the in-app reminder and, if enabled on this device (a
  localStorage preference, not synced), browser notifications; it records what it sent per day so reloads
  don't repeat them.
- `state.workoutPlan` (areas + length) drives Home's `TodayCard`: setup → today's workout → in progress →
  "Great Job!". It also seeds the Workout page's default selection.
- Provider order in `main.tsx`: `ProgressProvider > ToastProvider > CloudProvider`. Cloud depends on progress.

### Cloud sync (`src/cloud` + `state/CloudContext.tsx`)
- `CloudBackend` (`types.ts`) has two implementations: `drive.ts`/`driveStore.ts` (Google Identity Services +
  Drive REST, `drive.file` scope) and `mock.ts`. `getBackend()` in `index.ts` lazy-imports one of them. Keep the
  `import.meta.env.DEV && import.meta.env.VITE_CLOUD_MOCK === 'true'` check written inline there so production
  builds drop the mock.
- `documents.ts` maps `ProgressState` to documents: `progress` (mastered, goals, onboarded, weight goal, units)
  plus one `day:YYYY-MM-DD` per day with workouts, logged sets or a weigh-in. `diffDocs` produces the minimal
  `SaveOps`. Drive files are found by `appProperties`, not by name.
- `syncEngine.ts` reconciles on sign-in (upload, download or merge), debounces pushes of changed docs, pulls on
  return to the app, and goes into `reconnect` status when the roughly 1-hour access token expires.
- There's no refresh token (no backend), and Google only issues a new token in response to a user gesture.
  `CloudContext` renews access on the next `click` (capture phase) once it's within 5 minutes of expiring
  (`backend.accessExpiresAt`), unless "Stay connected" is off (`ascent:auto-reconnect`, per device). It shares
  an in-flight renewal with the Reconnect button and only shows the Reconnect toast if renewal fails. Listen
  to `click`, not `pointerdown`: a touch `pointerdown` isn't a user activation, so the Google window would be
  blocked on phones.
  `merge.ts` merges losslessly (union of logs by id, earliest mastery date, workouts by `startedAt`).
- **Adding a field to `ProgressState`** means updating the type, `initialProgress`, the reducer and
  `sanitizeProgress` in `progress.ts`; `toDocs`/`fromDocs` in `documents.ts`; and `emptyProgress`, `isPristine`
  and `mergeProgress` in `merge.ts`. Otherwise the field won't survive a reload, an import or a sync.

### UI
- Hash router in `src/lib/router.ts` (`#/trees/<tree>/<skill>`, `#/workout/<tree,tree>`, …). A new route needs
  the `Route` union, `parseHash`, `toHash`, and the title map and render switch in `App.tsx`.
- `SkillMap` uses React Flow (`@xyflow/react`) with dagre layout. Prerequisites from other trees appear as
  "ghost" nodes. Nodes are rebuilt on every progress change, so each must carry `measured` (its fixed layout
  size): without it React Flow drops the node's handle bounds and hides every edge until it re-measures, which
  shows up as the whole map flickering after "Mark mastered".
- The Privacy Policy and Terms (`pages/LegalPages.tsx`, `#/privacy` and `#/terms`) describe exactly what the app
  stores and sends. Update them and `LEGAL_UPDATED` (`data/legal.ts`) when that changes: new data, a new
  Google scope, or a new third-party service.
- Pages that copy progress into local state when they open (e.g. `StartPage`'s snapshot) must re-sync when it's
  replaced underneath them: signing in or a sync from another device can happen while the page is open.
- Styles are plain CSS in `src/styles/`, with design tokens in `base.css` (dark theme only). Icons come from
  `lucide-react`.
