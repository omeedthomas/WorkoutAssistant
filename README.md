# Ascent: calisthenics skill trees

A React web app (desktop and phone) that maps calisthenics strength as **skill trees**. Every skill is a
progression ladder (wall push-up → incline → knee → push-up → …). Ladders connect into bigger skills across
trees: the bar muscle-up needs chest-to-bar pull-ups (Pull) **and** straight-bar dips (Push), and the front
lever needs pull-ups **and** a hollow body hold (Core).

- **8 trees, 35 progressions, 124 exercises:** Push, Pull, Core, Legs, Handstand, Planche, Levers (front, back
  and human flag) and Muscle-up.
- **Start anywhere:** the *starting point* screen lets you pick the hardest step you can do in each
  progression. Everything before it, including prerequisites in other trees, is marked mastered.
  Locks are soft, so you can train or master any skill at any time.
- **Map or list view:** an interactive graph you can pan and zoom (touch or mouse), or a list of
  ladders that's easier to scan on a phone. The *All* view shows every tree and how they connect.
- **Skill details:** a how-to video, the mastery target (e.g. 3 × 12 reps), form cues, prerequisites and
  unlocks, a session logger with progress toward the target, and a "Target hit! Mark mastered?" prompt.
- **How-to videos:** every exercise has a YouTube tutorial, mostly from coaching channels (FitnessFAQs,
  Calisthenicmovement, Antranik, Simonster Strength, Minus The Gym, Squat University and others). The
  player loads only when you press play, in privacy-enhanced (no-cookie) mode.
- **Today's plan (automatic progression):** every exercise gets a prescription for the next session, worked
  out from your history (`src/lib/progression.ts`):
  - *No history:* start at about half the mastery target (e.g. push-ups 3 × 6 toward 3 × 12).
  - *Plan completed:* add a rep (or about 10% of the target, so +2 reps for 3 × 20, +5s for 45s holds).
  - *Fewer sets than the target:* add a set before adding reps.
  - *Stuck at the same numbers:* a stronger push to go up ("You've done 3 × 5 for 4 sessions in a row…").
  - *Missed the plan:* repeat it. After 3 misses in a row: one extra-volume session (e.g. 4 × 5) to break
    the plateau, then back to 3 × 6. A big miss resets the plan from what you actually did.
  - *Two weeks or more off:* ease back in slightly lighter.
  - *Target reached:* prompt to mark it mastered and move on to the next step.

  Each session logs what was planned alongside what you did. The panel shows the sets laid out, rest time,
  roughly how many sessions to mastery, and a chart of your recent sessions against the goal.
- **Daily workout generator:** choose a training day (Push + Pull, Handstand + Core, Legs + Core,
  Planche + Levers, Muscle-up + Pull, Full body) or any mix of trees, plus a length (~30/45/60 min). You get:
  1. *Warm-up:* a pulse raiser, then prep drills for each chosen area (wrists for handstands, active hangs
     for pulling, and so on).
  2. *Main work:* the exercises you're currently on in each tree, using the progression plan above. Goal
     paths come first. Skill work (balance and statics) runs first, then strength (alternating trees), then
     core. If a chosen tree isn't unlocked yet, it trains the steps that lead into it.
  3. *Cooldown:* stretches for the muscles you worked, ending with box breathing.

  Press *Start workout* to tick off drills and log each exercise with one tap ("Done as planned"), or enter
  different numbers. The started workout stays fixed for the day, even across reloads.
- **Suggested training day:** Home recommends the most-rested split you can train (skipping areas trained
  in the last day). The Workout page also suggests weekly schedules for 2–5 days a week.
- **Goals:** pick up to 5. Their full path is highlighted in gold, and *Today's session* prioritises it.
- **Today's session:** one unlocked exercise per movement pattern, goal paths first.
- **No account:** progress is saved in `localStorage`. You can export and import a JSON backup in Settings.

## Running it

Requires Node.js 20.19+ (22/24 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # also serves on your network, so you can open it on your phone (same Wi-Fi)
npm test           # data-integrity + logic tests (Vitest)
npm run build      # typecheck + production build into dist/
npm run check:videos  # confirms every how-to video still exists and allows embedding (needs internet)
```

`dist/` is a static site. Host it anywhere (Netlify, Vercel, GitHub Pages, or any static server). It uses hash
routing (`#/trees/push/pushup`), so no server rewrites are needed.

## Project layout

```
src/
  data/
    types.ts          TreeDef → TrackDef → StepDef (authoring format) and the flattened Exercise
    trees/*.ts        One file per skill tree (all exercise content lives here)
    index.ts          Builds the catalog: resolves prerequisites, dependents, tracks
    videos.ts         One YouTube how-to video per exercise
    drills.ts         Warm-up and cooldown drills
    splits.ts         Training-day groupings and weekly schedules
    catalog.test.ts   Guards the data: ids exist, no cycles, difficulty never decreases along a path
  lib/
    graph.ts          Status (mastered/ready/locked), ancestors, goal paths, session suggestions
    progression.ts    Next-session prescriptions from your logged history
    workout.ts        Daily workout generator and suggested training day
    layout.ts         dagre layout for the map (plus "ghost" nodes for prerequisites in other trees)
    router.ts         Tiny hash router
  state/
    progress.ts       Pure reducer, validation of stored/imported data
    ProgressContext   React context + localStorage persistence (synced across tabs)
  components/         SkillMap (React Flow), SkillNode, SkillList, SkillDetail, nav, toast…
  pages/              Train, Trees, Starting point, Settings
  styles/             Plain CSS with design tokens in base.css
```

## Adding or changing progressions

Everything is data in `src/data/trees/*.ts`. A **track** is a linear progression, and each step automatically
requires the step before it. Use `from` for what a track's first step needs, and `requires` for extra
prerequisites on a single step, which can come from any tree:

```ts
{
  id: 'decline',
  name: 'Decline & Pseudo Planche',
  from: ['pushup'],                    // first step unlocks after Push-up
  steps: [
    { id: 'decline-pushup', name: 'Decline Push-up', level: 4, target: reps(3, 12), description: '…', cues: ['…'] },
    {
      id: 'pseudo-planche-pushup',
      name: 'Pseudo Planche Push-up',
      level: 6,
      target: reps(3, 8),
      requires: ['planche-lean'],      // also needs a skill from the Planche tree
      description: '…',
      cues: ['…'],
    },
  ],
}
```

Targets: `reps(sets, n)`, `repsEach(sets, n)` (per side), `hold(sets, seconds)`, `holdEach(sets, seconds)`.
Levels run from 1 (anyone) to 10 (elite). Run `npm test` after editing. It catches typos in ids, cycles,
and prerequisites that are harder than the skill they unlock.

To add a whole new tree, create a `TreeDef` file, add its id to `TreeId` in `types.ts`, and add it to the
`trees` array in `data/index.ts`.

### Videos

Videos live in `src/data/videos.ts`, keyed by exercise id:

```ts
'pushup': { youtubeId: 'IODxDxX7oi4', title: 'The Perfect Push Up | Do it right!', channel: 'Calisthenicmovement' },
```

To swap one, take the 11-character id from a YouTube URL (`youtube.com/watch?v=<id>`), update the title and
channel, then run `npm run check:videos`. Some uploaders turn off embedding, and the check catches that. Every new
exercise needs a video entry, or `npm test` will fail.

## Stack

React 19, TypeScript, Vite, [React Flow](https://reactflow.dev) (`@xyflow/react`) for the map,
[dagre](https://github.com/dagrejs/dagre) for automatic layout, lucide icons, and Vitest.
