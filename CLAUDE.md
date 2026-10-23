# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ascent models calisthenics as skill trees, plans each session from logged history, and optionally syncs progress
to the user's own Google Drive. There is no backend. It's an npm workspaces monorepo:

- `packages/core` (`@ascent/core`): everything both apps share. That means the exercise catalog, progression,
  the workout generator, history and streaks, and the saved and synced progress format. It's plain TypeScript,
  imported as source (`@ascent/core/data`, `@ascent/core/lib/workout`, …) through its `exports` map; there's no
  build step.
- `apps/web` (`@ascent/web`): the React 19 + Vite web app (static site, hash routing).
- `apps/mobile` (`@ascent/mobile`): the native Android/iOS app (Expo SDK 58, React Native, Expo Router). It has
  its own UI and uses core for all logic. Read `apps/mobile/AGENTS.md` before touching Expo APIs.

README.md has the user-facing feature list and the Google Cloud setup steps.

## Commands

Requires Node.js 20.19+. Run everything from the repo root (one `npm install` there installs all workspaces).

```bash
npm run dev            # web app at http://localhost:5173 (strictPort)
npm run dev:lan        # also serve on the LAN
npm run mobile         # Expo dev server: scan the QR code with Expo Go on a phone
npm test               # Vitest in core and web
npm run typecheck      # core and web (TypeScript 7) and mobile (TypeScript 6, pinned by Expo)
npm run build          # web: typecheck + vite build into apps/web/dist/
npm run check:videos   # hits YouTube oEmbed to confirm every video exists and allows embedding (needs network)

npx vitest run src/lib/progression.test.ts       # one file (from packages/core)
npx vitest run -t "has no prerequisite cycles"   # one test by name (from packages/core)
npm run doctor -w @ascent/mobile                 # expo-doctor: dependency and config checks
npx expo export --platform android --platform ios --output-dir <tmp>   # from apps/mobile: proves the native bundles build
```

There is no linter. Core and web TypeScript are strict with `noUnusedLocals`, `noUnusedParameters` and
`verbatimModuleSyntax` (type-only imports must use `import type`), so unused code fails the build.

Fake accounts without Google: `VITE_CLOUD_MOCK=true npm run dev` (PowerShell: `$env:VITE_CLOUD_MOCK='true'; npm run dev`).
The mock "Drive" lives in localStorage; set `localStorage['ascent:mock-expired'] = '1'` to simulate expired access (the next tap renews it automatically; `ascent:mock-renewals` counts renewals).
Real sign-in needs `VITE_GOOGLE_CLIENT_ID` in `apps/web/.env.local` (see `apps/web/.env.example`); without it the web app runs local-only.

## Monorepo rules
- **Core stays portable.** `packages/core/src/portable.test.ts` fails if core code uses `localStorage`, `window`,
  `document`, `navigator`, speech, `import.meta.env`, React, React Native or Expo. Storage, speech, env config,
  network status and UI belong to each app; core takes them as parameters or hooks (e.g. `SyncEngine`'s
  `MetaStore` and `isOffline`, `restoreActiveWorkout(raw)` for whatever an app stored).
- **One React.** Expo pins React exactly (19.3.0 for SDK 58), and a second copy in the bundle crashes the app with
  "Invalid hook call". The root `package.json` `overrides` and the web app's exact `react`/`react-dom` versions
  keep a single copy; change them together when upgrading Expo. React Native must never be duplicated
  (`npm why react-native`).
- Mobile dependencies: add them with `npx expo install <pkg>` from `apps/mobile` so versions match the SDK.

## Architecture (`packages/core/src` unless noted)

### Data: authored trees → flattened catalog
- `data/trees/*.ts` hold all exercise content as `TreeDef → TrackDef → StepDef`. Each step implicitly requires
  the previous step in its track; `from` sets the first step's prerequisites and `requires` adds extra ones from
  any tree. Targets come from the helpers in `data/targets.ts`.
- `data/index.ts` runs `buildCatalog` once at import time to produce `exercises`, `exerciseById`, `tracks`,
  `trackByKey` and `dependentsOf`. Import catalog data from `@ascent/core/data`, not from individual tree files.
- A new tree also needs its id in `TreeId` (`types.ts`), an entry in the `trees` array (`index.ts`), an
  `ultimate` skill (the Home skill card tracks progress along the path to it), and a card photo in
  `apps/web/src/assets/trees/` registered in `apps/web/src/data/treeImages.ts` (credit it in the README). Also
  add it to `BLOCK_OF` in `lib/workout.ts`.
- Weighted exercises (`weighted()` / `weightedEach()` targets) carry `target.addedKg`, the mastery load. They
  progress by load, not reps (`planWeighted` in `progression.ts`), and `generateWorkout` holds them back until
  the user has logged one or made it a goal, since they need equipment.
- Trees have a `kind`: `'skill'` (the eight calisthenics trees plus Breakdance) or `'therapy'` (Shoulder Rehab,
  Lower Back, Hips, Mobility). Both apps show them in separate sections, and `generateWorkout` puts therapy
  exercises in their own last block.
- Equipment: `StepDef.equipment` lists the gear an exercise needs (any one will do) and `alternatives` suggests
  exercise ids for people without it. `state.equipment` (`null` = never set, so nothing is filtered) holds what
  the user owns. `lib/equipment.ts` decides access (`ready` / `substitute` via a household stand-in from
  `data/equipment.ts` / `missing`), and `fitEquipment` in `workout.ts` adds setup notes or swaps exercises.
- `data/catalog.test.ts` checks the catalog: ids exist, no cycles, a prerequisite is never harder than what it
  unlocks, and every exercise has exactly one entry in `videos.ts`. Run `npm test` after any data change.
  Warm-up/cooldown drills (`drills.ts`) reuse an exercise's video via `exercise`, or have their own entry in
  `drillVideos`; `lib/guided.test.ts` checks every drill has one.
- Daily mobility routines (`data/routines.ts`) are ordered lists of drill ids. Drills with `phase: 'mobility'`
  only appear in routines; routines can also use warm-up/cooldown drills. A finished routine is stored as a
  `WorkoutRecord` with `routine` set (focus `['mobility']`), so it shows in History and counts for the streak,
  but the web `TodayCard` ignores it when deciding whether today's planned workout is done.
- `scripts/check-videos.mjs` (repo root) parses `data/videos.ts` with a regex, so keep each entry on one line in
  the form `'exercise-id': { youtubeId: '...', title: '...', channel: '...' },`.
- **Exercise ids are persisted** (local storage on both apps, JSON exports, Drive files). `sanitizeProgress`
  silently drops unknown ids, so renaming or removing an id discards users' mastery and logs for it.
- A step inserted into an existing track (e.g. Assisted Scapular Pull before Scapular Pull) needs `addedAt`:
  `sanitizeProgress` then counts it as mastered for anyone who already mastered or logged a later step of that
  track, so it doesn't become their "current step" or lock what they were training. Without it, the new step
  turns up in their workouts and the step after it locks.

### Pure logic (`lib/`)
`graph.ts` (status, ancestors, goal paths), `progression.ts` (`planSession`: the next-session prescription
from history; mastered exercises keep progressing past the target via `planMastered`), `workout.ts`
(`generateWorkout`: `mainCount` exercises split across the chosen areas; each area's list is the goal path, then
current steps with main tracks before variations, one due mastered exercise (`maintenanceFor`) slotted in right
after the first, then lead-ins, then steps a little ahead (`NEXT_UP_GAP`) so every area gets at least
`MIN_PER_AREA`; a test sweeps every tree to hold that; `suggestSplit`), `history.ts` (per-day summaries, streaks,
rep growth, body-weight goal progress, `workoutDone`), `sets.ts` (sessions whose sets differed),
`today.ts` (`todayAtAGlance`: the streak and today's
workout, for the widget), `reminders.ts` (`upcomingReminders`), `calories.ts` (MET-based estimates) and
`guided.ts` are pure functions of the catalog plus `ProgressState`. Tests run in Vitest's `node` environment with no
DOM, so logic that needs tests belongs in core, not in either app's components.

**Weights are always stored in kg** (`addedKg` on logs, plans and targets, weigh-ins, the weight goal).
`state.units` (`lb`/`kg`) only changes display and input; convert with `lib/units.ts`. Plans snap loads to
5 lb / 2.5 kg plates (`snapLoad`), and targets display rounded up so hitting the shown number meets them.

**Sets can differ** (10, then 9, then 8 reps). `Work.perSet` keeps each set when they do (only then), and
`value` is the lowest, what every set reached, so `meets`/`meetsTarget` stay "every set hit it". Anything that
adds work up (day totals, calories, rep growth) must use `lib/sets.ts` (`setValues`, `totalWork`, `averageSet`),
never `sets × value`; build a session from sets with `workFromSets`. Progression judges how far a miss fell by
the average set (`typical`), so 10, 8, 6 against 3 × 10 repeats the plan instead of resetting to 6s.

**How it felt.** `LogEntry.feel` (`'easy' | 'hard'`) is set after a workout on the exercises you pick, and the
next plan for that exercise is `'easier'` (a step fewer reps, or a plate lighter) or `'harder'` (two steps or
plates up, capped at the target until mastered), ahead of the miss logic but after mastery and a long break.
It only affects the next session. `WorkoutRecord.rating` holds the whole workout's Easy / Just right / Too hard;
`feedbackFor` (`state/activeWorkout.ts`) turns the answer into the `rateLog` calls both apps make.
`editLog` and `rateLog` stamp `edited`, and merging keeps the most recently edited copy of a log.

### State
- `state/progress.ts` holds the single `ProgressState` (`version: 1`), its reducer, and `sanitizeProgress`,
  the one validation gate for anything loaded from storage, an imported file or the cloud.
- `state/activeWorkout.ts` defines the started workout: a snapshot for that day (`snapshot`), so logging sets
  mid-workout doesn't regenerate it, plus the guided player's state (`guided`, `position`) and
  `restoreActiveWorkout` to validate a stored one. Each app stores it under `ascent:workout:v1`.
- Both apps keep progress under `ascent:progress:v1` in the same format (web: localStorage; mobile: AsyncStorage),
  and change it only through a `useProgress()` API with the same methods.
- Guided workouts: `lib/guided.ts` turns the snapshot (`guidedSteps`) or a mobility routine (`routineSteps`) into
  steps (every set, each side of a per-side timed hold), rest lengths (`restSeconds` in `progression.ts`, also
  used for "Rest …" labels and time estimates) and announcer lines. Each app has its own player state machine
  (get-ready → work → rest on `Date.now()`-based timers): web `components/GuidedPlayer.tsx`, mobile
  `src/lib/useGuidedPlayer.ts`. Both keep each completed set's reps (− and + before Done; `step.value` is the
  plan), let you correct them while resting, and call `onItemDone(step, sets)` when an exercise ends and again
  after a correction; the owner logs it the first time and `editLog`s it after (`initialSets` seeds exercises
  already logged, so redoing one set keeps the rest). Both ask "How was this workout?" when you finish.
- "Too hard? Switch to …": `easierStep` (`state/activeWorkout.ts`) is the previous step of the exercise's track
  (or the step its track starts from), skipping ones already in the workout or needing gear you lack;
  `swapExercise` replaces an unlogged exercise with it, planned by `planSession`, keeps the original in
  `swappedFrom` (to switch back as planned) and moves `position` to its first set. Each app's session has
  `swap(from, to, state)`, and the players are keyed by the exercise ids so they restart on the new steps.
- Days are local calendar days (`localDay()`, `YYYY-MM-DD`), not UTC. Logs, workouts and weigh-ins are filed by
  them; do date arithmetic on them with `addDays` / `daysBetween` from `lib/history.ts`.
- Streak timing lives in `lib/history.ts` (`streakOf`, `streakDeadline`, `streakUrgency`, `REMINDER_HOURS`).
- `state.workoutPlan` (areas + length) drives Today: the web `TodayCard` and the mobile Today tab.

### Cloud sync (core `cloud/` + web `apps/web/src/cloud` and `state/CloudContext.tsx`)
- Core has the format and the engine: `documents.ts` maps `ProgressState` to documents (`progress` with
  mastered, goals, onboarded, weight goal and units, plus one `day:YYYY-MM-DD` per day with workouts, logged
  sets or a weigh-in); `diffDocs` produces the minimal `SaveOps`; `merge.ts` merges losslessly (union of logs by
  id, the latest `edited` winning, earliest mastery date, workouts by `startedAt`, finished and rated first); `driveStore.ts` is the Drive REST layer (files found by
  `appProperties`, not by name); `syncEngine.ts` reconciles on sign-in (upload, download or merge), debounces
  pushes of changed docs, pulls on return to the app, and goes into `reconnect` status when the roughly 1-hour
  access token expires.
- The web app supplies the rest: `CloudBackend` implementations `drive.ts` (Google Identity Services, `drive.file`
  scope) and `mock.ts`, `getBackend()` in `index.ts` (keep the `import.meta.env.DEV && import.meta.env.VITE_CLOUD_MOCK
  === 'true'` check written inline there so production builds drop the mock), and `metaStore.ts` (the engine's
  bookkeeping in localStorage).
- There's no refresh token (no backend), and Google only issues a new token in response to a user gesture.
  `CloudContext` renews access on the next `click` (capture phase) once it's within 5 minutes of expiring
  (`backend.accessExpiresAt`), unless "Stay connected" is off (`ascent:auto-reconnect`, per device). Listen to
  `click`, not `pointerdown`: a touch `pointerdown` isn't a user activation, so the Google window would be
  blocked on phones.
- The mobile app supplies its own: `apps/mobile/src/cloud/googleDrive.ts` (native Google Sign-In,
  `@react-native-google-signin/google-signin`, `drive.file` scope, over core's `driveStore`; uid is the Google
  account id, the same as the web's `sub`), `mock.ts` (`EXPO_PUBLIC_CLOUD_MOCK=true`, dev only), and `local.ts`
  (MetaStore and Drive content cache: AsyncStorage loaded into memory, since core reads them synchronously).
  `state/CloudContext.tsx` mirrors the web one: pull on `AppState` active, `NetInfo` for offline/online, "Sync
  now" pushes then pulls, and a lapsed token is first renewed silently (the native SDKs keep a refresh token).
  On Android, `getTokens()` keeps returning a cached token, so `onUnauthorized` calls `clearCachedAccessToken`.
- Google client ids for the phone come from `apps/mobile/.env.local` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = the
  web's client id, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`). They must be in the same Cloud project as the web client
  so `drive.file` lets every client see the same files. Android also needs an Android OAuth client with the
  signing key's SHA-1. `app.config.ts` adds the sign-in config plugin only when there's an iOS client id: with
  no options the plugin assumes Firebase and breaks Android builds.
- **Adding a field to `ProgressState`** means updating the type, `initialProgress`, the reducer and
  `sanitizeProgress` in `progress.ts`; `toDocs`/`fromDocs` in `documents.ts`; and `emptyProgress`, `isPristine`
  and `mergeProgress` in `merge.ts`. Otherwise the field won't survive a reload, an import or a sync.

### Web UI (`apps/web/src`)
- Hash router in `lib/router.ts` (`#/trees/<tree>/<skill>`, `#/workout/<tree,tree>`, …). A new route needs
  the `Route` union, `parseHash`, `toHash`, and the title map and render switch in `App.tsx`.
- `SkillMap` uses React Flow (`@xyflow/react`) with dagre layout (`lib/layout.ts`). Prerequisites from other trees
  appear as "ghost" nodes. Nodes are rebuilt on every progress change, so each must carry `measured` (its fixed
  layout size): without it React Flow drops the node's handle bounds and hides every edge until it re-measures,
  which shows up as the whole map flickering after "Mark mastered".
- Speech goes through `lib/announcer.ts` (`speechSynthesis`); its on/off and demo-video preferences are per device
  in localStorage (`ascent:guide`). `StreakReminder` (mounted once in `App.tsx`) shows the in-app reminder and,
  if enabled on this device, browser notifications.
- Signing out clears this device's progress and the started workout (`clearActiveWorkout`). Home starts a workout
  without the Workout page mounted by writing the snapshot (`saveActiveWorkout`).
- Provider order in `main.tsx`: `ProgressProvider > ToastProvider > CloudProvider`. Cloud depends on progress.
- The Privacy Policy and Terms (`pages/LegalPages.tsx`, `#/privacy` and `#/terms`) describe exactly what the app
  stores and sends. Update them and `LEGAL_UPDATED` (`data/legal.ts`) when that changes: new data, a new
  Google scope, or a new third-party service.
- Pages that copy progress into local state when they open (e.g. `StartPage`'s snapshot) must re-sync when it's
  replaced underneath them: signing in or a sync from another device can happen while the page is open.
- Styles are plain CSS in `styles/`, with design tokens in `base.css` (dark theme only). Icons come from
  `lucide-react`.

### Mobile UI (`apps/mobile/src`)
- Expo Router: every file in `app/` is a screen. `(tabs)/` holds Today, Skills, History and Me; `tree/[id]`,
  `exercise/[id]` and the full-screen `workout` player sit on the root stack. `_layout.tsx` loads saved state
  (`ProgressProvider`, `ActiveWorkoutProvider`, `PrefsProvider` in `state/`) before showing anything.
- Colors mirror the web tokens in `theme.ts` (dark only); shared controls are in `components/ui.tsx`; icons come
  from `@expo/vector-icons` (Ionicons).
- Use `role` and `aria-*` props for accessibility, not the older `accessibilityRole`/`accessibilityState`:
  react-native-web drops those, and the phones read both. The exception is `Switch`, which passes `aria-label` to
  the native view unconverted, so use `Toggle` from `components/ui.tsx`.
- The voice coach is `expo-speech` (`lib/coach.ts`, on/off in `ascent:prefs:v1`, per device); the player keeps
  the screen on with `useKeepAwake`. `lib/dialogs.ts` wraps `Alert` because it does nothing on web.
- Reminders are local notifications (`expo-notifications`, no push server). Core's `upcomingReminders`
  (`lib/reminders.ts`) decides what to send; `lib/notifications.ts` replaces every scheduled one with that list
  (one at a time, through a queue). `lib/useOutsideTheApp.ts` (mounted in `_layout.tsx`) reruns it after each
  change and when the app opens or closes. The settings are per device (`ascent:prefs:v1`). There's no
  exact-alarm permission (Play only allows it for alarm and calendar apps), so Android gives each reminder a
  delivery window of up to an hour and may send it that late (`adb shell dumpsys alarm` shows them scheduled).
- The Android home screen widget is `react-native-android-widget`, declared in `app.json`'s plugin config (name
  `Today`). Android draws it by running JS in the background, so `index.ts` (package.json `main`) registers its
  handler before Expo Router loads. `widget/index.android.tsx` reads the saved progress from AsyncStorage and
  renders `TodayWidget` (only the library's widget components, never React Native views), and
  `useOutsideTheApp` redraws it after changes; `widget/index.tsx` is the no-op for iOS and web. Its content comes
  from core's `todayAtAGlance` (`lib/today.ts`), the same as Today. A development build needs Metro running to
  draw it.
- No emulator is needed to check screens: `npx expo export --platform web` renders the same React Native UI in a
  browser.
- Native modules (Google Sign-In) need a **development build** (`expo-dev-client`); Expo Go doesn't have them.
  `cloud/index.ts` checks `TurboModuleRegistry.get('RNGoogleSignin')` before loading the Google backend, because
  importing it without the native half throws. Build locally with `npm run android -w @ascent/mobile`
  (`expo run:android`; needs JDK 17 and `ANDROID_HOME`) or in the cloud with EAS (`eas.json`: `development`,
  `ios-simulator`, `preview`, `production`). `android/` and `ios/` are generated by prebuild and gitignored.
- The Android emulator on Windows needs Windows Hypervisor Platform (`emulator -accel-check`). The AVD here is
  `Pixel_8_API_36` (Google Play image, so Google sign-in works).
- **OneDrive.** The project lives in the owner's OneDrive folder. Metro works there while the files are on the
  device, even though they're OneDrive reparse points, but online-only placeholders break it ("Unable to resolve
  react/jsx-runtime" although the file exists). So the folder should be set to "Always keep on this device". The
  path is too long for native Android builds (below), so do those with EAS or from a temporary short-path copy.
- **Windows path limit in native Android builds.** CMake names object files after their full source path, past 260
  characters. `plugins/withShortCmakeObjectPaths.js` sets `CMAKE_OBJECT_PATH_MAX=255` (Android builds don't get
  CMake's Windows default; a lower value leaves no room for the hash and CMake gives up), which needs the repo
  root to be at most about 27 characters (worst case: react-native-gesture-handler's codegen, which Expo Router
  loads, so it can't be excluded). A `subst` drive doesn't work: Gradle mixes the two roots. `expo run:android`
  only prebuilds when `android/` is missing, so delete it after config or plugin changes.
