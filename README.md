# Ascent: calisthenics skill trees

A React web app (desktop and phone) that maps calisthenics strength as **skill trees**. Every skill is a
progression ladder (wall push-up → incline → knee → push-up → …). Ladders connect into bigger skills across
trees: the bar muscle-up needs chest-to-bar pull-ups (Pull) **and** straight-bar dips (Push), and the front
lever needs pull-ups **and** a hollow body hold (Core).

- **8 trees, 40 progressions, 129 exercises:** Push, Pull, Core, Legs, Handstand, Planche, Levers (front, back
  and human flag) and Muscle-up.
- **Weighted progressions:** weighted push-ups, dips, pull-ups, chin-ups and Bulgarian split squats. You log the
  added weight with each session, and the plan adds the smallest plate (5 lb or 2.5 kg) each time you complete
  it, past the mastery target if you keep going. They only join generated workouts once you've logged one, so
  nobody without weights gets them by surprise.
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
- **Workout plan (Home):** choose the areas you're training (e.g. Push + Pull + Core, or Push + Handstand)
  and a workout length, and save it. You can adjust it any time. Every day Home shows that day's workout from
  your plan, with time and calories, and starts it in one tap. After you train, it says "Great Job!" with the
  calories burned, time taken, exercises and reps. Without a plan, Home helps you set one up.
- **Skill cards (Home):** a grid of square photo cards, one per area, showing how far along the path to its
  ultimate skill you are (e.g. One-arm Push-up, Full Planche), how much of the tree you've mastered, and
  your next step. Tap a card to open that tree.
- **Suggested training day:** the Workout page recommends the most-rested split you can train (skipping
  areas trained in the last day), and suggests weekly schedules for 2–5 days a week.
- **Streak:** Home shows your current streak and the last seven days. Rest days don't break it; three in a
  row do. A live countdown shows when the streak ends without a workout (midnight after your last allowed
  day). It turns gold the day before and red on the last day, when Home says a workout is needed and the app
  reminds you as you open it. Turn on **Streak reminders** in Settings to also get browser notifications at
  6 PM and 10 PM on that last day. These need Ascent open in a tab (it can be in the background), since a web
  app without a server can't wake itself up.
- **History:** a calendar of the days you trained. Tap a day to see each workout, every set, an estimated
  calorie burn and that day's weigh-in. It also shows your best streak and this month's totals.
- **Calories:** every workout shows an estimate before you start, a running total while you train, and
  saves the estimate when you finish. It uses standard MET values and your logged body weight.
- **Body weight:** log your weight, set a goal and follow a progress bar toward it. Choose lb or kg in
  Settings.
- **Weight fluctuation (History):** a chart of every weigh-in with a 7-day average trend line and your goal,
  plus bars showing how much your weight changed between weigh-ins. Pick 30 days, 3 months, 1 year or all
  time. It also shows the overall change, low and high, typical swing and biggest swing, with a table view.
- **Rep growth (History):** see how your reps, hold times or added weight have moved on recently trained
  exercises.
- **Goals:** pick up to 5 from any skill's details. Their full path is highlighted in gold, and generated
  workouts prioritise it.
- **Google sign-in, saved to your own Google Drive (optional):** progress goes to
  `My Drive/Ascent/`, with a readable file per training day in `Ascent/workouts/`, so you can use it on
  any device. It also stays in the browser, so the app works offline and without an account. See
  [Accounts](#accounts-google-sign-in--google-drive) below to switch it on. You can always export and
  import a JSON backup in Settings.

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

## Accounts (Google sign-in + Google Drive)

People sign in with Google, and their progress is saved in **their own Google Drive**. There's no
database or server of ours. Until a client id is configured (below), the app runs local-only and hides
the sign-in button.

```
My Drive/
  Ascent/
    progress.json                       mastered skills, goals
    workouts/
      2026-10-16 Training.json          one file per training day…
      2026-10-18 Push + Pull.json       …named after that day's workout
```

Each day file is readable JSON: the workout(s) you started (with the calorie estimate once finished), every
set you logged (exercise name, sets, reps or seconds, any added weight, and what was planned) and that day's
weigh-in. Weights are in kg. Files are tracked by hidden app properties, so renaming or moving
them in Drive is fine. Edits you make to them are picked up on the next sync. Days you delete in the app
go to the Drive trash.

Ascent asks only for the **`drive.file`** permission, so it can see and change only the files it created,
never the rest of anyone's Drive. Google classes this as a non-sensitive scope.

### Set it up (about 10 minutes, free)

1. **Create a Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com)
   (project menu → *New project*, e.g. "Ascent").
2. **Turn on the Drive API:** *APIs & Services → Library → Google Drive API → Enable*.
3. **Configure the consent screen** (*Google Auth Platform*, or *APIs & Services → OAuth consent
   screen*):
   - *Branding:* app name "Ascent" and a support email.
   - *Audience:* External. While the app is in **Testing**, add yourself and anyone else who'll try it
     under *Test users*.
   - *Data access:* add the scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` and
     `.../auth/drive.file`.
4. **Create the OAuth client:** *Clients* (or *Credentials*) *→ Create client → Web application*. Under
   **Authorized JavaScript origins**, add `http://localhost:5173` and, later, your site's HTTPS address.
   Redirect URIs aren't needed.
5. **Add the client id:** copy `.env.example` to `.env.local` and set
   `VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com`. The id isn't secret, and
   `.env.local` is gitignored anyway.
6. **Restart** `npm run dev`. A *Sign in* button appears in the header and in Settings.
7. **When you're ready for others:** deploy the `dist/` folder to any HTTPS static host (Netlify,
   Vercel, Cloudflare Pages, GitHub Pages…), add that address to the authorized JavaScript origins, and
   *Publish* the app on the Audience page. Until then, only the listed test users can sign in.

Sign-in needs `localhost` or HTTPS. To test on your phone, use the deployed site rather than
`http://<your-LAN-IP>`.

### How syncing works (`src/cloud/`)

- **First sign-in:** anything already on the device is uploaded. If the Drive already has Ascent data
  (from another device), the two are **merged**: mastered skills, sessions, goals and workouts from both,
  with nothing lost.
- **After that:** each change writes only the files that changed (usually just today's) a moment after
  you make it. Coming back to the app re-reads Drive to pick up your other devices' changes. Only files
  changed since the last sync are downloaded.
- **Access lasts about an hour.** A browser app with no server only gets short-lived Google access. When
  it expires, everything keeps working and saving on the device, and the header shows **Reconnect**.
  One tap renews access (usually without any prompt) and uploads what's waiting. A small backend that
  stores refresh tokens would remove this step, if you ever want one.
- **Offline:** changes stay on the device and upload when you're back. If you close the app first,
  they're merged on your next visit.
- **Signing out** clears this device's copy, so the next person who uses the browser starts fresh.
  Everything stays in your Drive.

**Trying it without Google:** run `VITE_CLOUD_MOCK=true npm run dev` (PowerShell:
`$env:VITE_CLOUD_MOCK='true'; npm run dev`). This gives you a fake "Test User" whose "Drive" is
`localStorage`. Set `localStorage['ascent:mock-expired'] = '1'` to try the Reconnect flow. It's
development only and never included in production builds.

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
    history.ts        Per-day summaries, streaks, rep growth, body-weight goal progress
    calories.ts       Calorie estimates (MET values × body weight × time)
    units.ts          lb/kg conversion and plate rounding (weights are stored in kg)
    layout.ts         dagre layout for the map (plus "ghost" nodes for prerequisites in other trees)
    router.ts         Tiny hash router
  cloud/
    drive.ts          Google sign-in (Identity Services) + access tokens
    driveStore.ts     Google Drive files: Ascent/, progress.json, workouts/<day> <workout>.json
    documents.ts      Progress ⇄ documents (one per training day), and the minimal diff
    syncEngine.ts     Reconcile on sign-in, push changes, pull other devices' changes, reconnect
    merge.ts          Lossless merge of two copies of progress
    mock.ts           Dev-only fake accounts
  state/
    progress.ts       Pure reducer, validation of stored/imported data
    ProgressContext   React context + localStorage persistence (synced across tabs)
    CloudContext      Account state, sync status, sign in/out
  components/         SkillMap (React Flow), SkillNode, SkillList, SkillDetail, nav, toast…
  pages/              Train, Workout, History, Trees, Starting point, Settings
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

React 19, TypeScript, Vite, Google Identity Services + the Google Drive API for accounts, [React Flow](https://reactflow.dev) (`@xyflow/react`) for the map,
[dagre](https://github.com/dagrejs/dagre) for automatic layout, lucide icons, and Vitest.

## Photo credits

The Home skill-card photos (`src/assets/trees/`, 640 × 640 crops) are from [Unsplash](https://unsplash.com),
free to use under the [Unsplash License](https://unsplash.com/license):

| Card | Photographer | Photo |
| --- | --- | --- |
| Push | Connor Bowden | [unsplash.com/photos/KgWaohVS-mc](https://unsplash.com/photos/KgWaohVS-mc) |
| Pull | Shoham Avisrur | [unsplash.com/photos/3HnxyD3J1Qg](https://unsplash.com/photos/3HnxyD3J1Qg) |
| Core | Stan Georgiev | [unsplash.com/photos/2OgqFKHwF5Q](https://unsplash.com/photos/2OgqFKHwF5Q) |
| Legs | Nikola Murniece | [unsplash.com/photos/-pNl3iYMsdI](https://unsplash.com/photos/-pNl3iYMsdI) |
| Handstand | Tyler Zhang | [unsplash.com/photos/Ni-lM0S0BxQ](https://unsplash.com/photos/Ni-lM0S0BxQ) |
| Planche | GMB Fitness | [unsplash.com/photos/NYCVycvTbek](https://unsplash.com/photos/NYCVycvTbek) |
| Levers | Karsten Winegeart | [unsplash.com/photos/GYktdLWpxx4](https://unsplash.com/photos/GYktdLWpxx4) |
| Muscle-up | Charan S | [unsplash.com/photos/pQ8Ltw-MFWE](https://unsplash.com/photos/pQ8Ltw-MFWE) |

To swap one, replace the file in `src/assets/trees/` (a square WebP works best) and update this table.
