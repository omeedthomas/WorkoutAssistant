# Ascent: calisthenics skill trees

A React web app (desktop and phone) and a native Android/iOS app that map calisthenics strength as
**skill trees**. Both share one core of exercise data and training logic (`packages/core`). Every skill is a
progression ladder (wall push-up → incline → knee → push-up → …). Ladders connect into bigger skills across
trees: the bar muscle-up needs chest-to-bar pull-ups (Pull) **and** straight-bar dips (Push), and the front
lever needs pull-ups **and** a hollow body hold (Core).

- **13 trees, 71 progressions, 228 exercises:** nine skill trees (Push, Pull, Core, Legs, Handstand,
  Planche, Levers (front, back and human flag), Muscle-up and Breakdance) and four physical therapy and mobility
  trees.
- **Breakdance:** freezes and power moves, each with its own ladder. Freezes: the baby freeze and air baby
  (from the frog stand), turtle freeze, chair freeze → pike freeze → airchair, tripod headstand, and head
  hollowback → hollowback. Power moves: turtles, backspin → baby windmill → windmill, swipes, tapping headspin →
  headspin, flare lift → half flare → flare → continuous flares → airflare, and the 2000 → 1990 hand spins.
  The harder moves build on other trees: flares need a tuck L-sit and pike compression (Core), the airchair a
  handstand kick-up, the hollowback and hand spins a freestanding handstand (Handstand).
- **Physical therapy & mobility:** Shoulder Rehab (shoulder-blade control, then rotator cuff work with bands,
  dumbbells, kettlebells and an exercise ball, up to the Turkish get-up), Lower Back (gentle mobility, McGill-style
  core, the hip hinge up to kettlebell swings, Pallof presses), Hips (hip flexor and glute stretches, 90/90 and
  hip CARs, glute med work, Copenhagen planks, up to the Cossack squat) and Mobility (hamstrings to a full pike,
  upper back, chest and ankles). They have their own section on Home and a *Recovery & mobility* training day.
- **Balance variants:** harder, more stable-shoulder versions of existing skills on unstable surfaces:
  BOSU and exercise-ball push-ups, a BOSU pike hold and BOSU handstands (against the wall, then freestanding),
  exercise-ball planks, rollouts, stir-the-pot and pikes, and BOSU squats and split squats.
- **Equipment:** tell Ascent what you have (pull-up bar, dip bars, parallettes, rings, bands, dumbbells,
  kettlebell, exercise ball, BOSU, foam roller…). Workouts only include what you can do: if a stand-in works
  (two sturdy chairs for dips, water bottles for light dumbbells), the exercise gets a setup note; if not, it's
  swapped for the closest alternative you can do. Each skill's details say what it needs and suggest
  alternatives.
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
- **How-to videos:** every exercise and every warm-up and cooldown drill has a YouTube tutorial, mostly from
  coaching and physical therapy channels (FitnessFAQs, Calisthenicmovement, Antranik, Simonster Strength, Minus
  The Gym, Squat University, Rehab My Patient and others). The player loads only when you press play (or follow a
  guided workout), in privacy-enhanced (no-cookie) mode.
- **Today's plan (automatic progression):** every exercise gets a prescription for the next session, worked
  out from your history (`packages/core/src/lib/progression.ts`):
  - *No history:* start at about half the mastery target (e.g. push-ups 3 × 6 toward 3 × 12).
  - *Plan completed:* add a rep (or about 10% of the target, so +2 reps for 3 × 20, +5s for 45s holds).
  - *Fewer sets than the target:* add a set before adding reps.
  - *Stuck at the same numbers:* a stronger push to go up ("You've done 3 × 5 for 4 sessions in a row…").
  - *Missed the plan:* repeat it. After 3 misses in a row: one extra-volume session (e.g. 4 × 5) to break
    the plateau, then back to 3 × 6. A big miss resets the plan from what you actually did.
  - *Two weeks or more off:* ease back in slightly lighter.
  - *Target reached:* prompt to mark it mastered and move on to the next step.
  - *Mastered:* hit the target (or your recent best) to maintain it. Each time you complete the plan, the next
    session adds a rep or a few seconds, so your max keeps growing, up to twice the target.

  Each session logs what was planned alongside what you did. The panel shows the sets laid out, rest time,
  roughly how many sessions to mastery, and a chart of your recent sessions against the goal.
- **Daily workout generator:** choose a training day (Push + Pull, Handstand + Core, Legs + Core,
  Planche + Levers, Muscle-up + Pull, Full body, Recovery & mobility) or any mix of trees, plus a length.
  Every area gets at least two exercises: Short gives 2 per area, Standard 3 (up to 12 in all) and Long 4 (up
  to 16), with at least 3, 5 and 7 for a single area. More areas make a longer workout, and each length button
  shows the estimated time for what you picked. You get:
  1. *Warm-up:* a pulse raiser, then prep drills for each chosen area (wrists for handstands, active hangs
     for pulling, and so on).
  2. *Main work:* your current step in each of an area's progressions, using the progression plan above.
     Goal paths come first, then the main progressions (push-ups and dips, squats and glute bridges…) before
     variations of them. Skill work (balance and statics) runs first, then strength (alternating trees), then
     core. If a chosen tree isn't unlocked yet, or has only a step or two unlocked, it trains the steps that lead
     into it (leaving those from other chosen areas to them). If that's still not enough, it adds steps a little
     ahead (at most two unmastered steps away), at an easy starting prescription. A beginner's Handstand, next to
     Push and Core, gets the Elevated Pike Hold and Wall Walk.
     Mastered exercises come back too: the hardest mastered step of a progression returns once you haven't done
     it for a week (at most one per area every few days, and never ahead of your goals), with a plan to
     maintain it or beat your best.
  3. *Cooldown:* stretches for the muscles you worked, ending with box breathing.

  Each drill shows a thumbnail you can tap to watch it, and timed drills (jumping jacks, holds, stretches) are
  marked. The started workout stays fixed for the day, even across reloads.
- **Guided workouts:** *Start workout* walks you through it from the top, one set at a time. Each step shows
  a looping, muted demo video and either the reps to do (tap *Done*) or a timer, which starts after a 5-second
  get-ready countdown. Per-side holds and stretches time each side, with a "switch sides" countdown between.
  Rest follows every set: short for therapy and easy steps (30–45 s), about 2 minutes for push-ups and other
  sets worked close to your limit, 2–3 minutes for advanced and weighted ones, with +15 s and *Skip rest*.
  An announcer reads it out ("Time to do Push-up for 12 reps", "Rest for 2 minutes. Next up: …") and counts
  3, 2, 1 into every timer and at the end of each set and rest. Mute it with the speaker button during the
  workout or turn it off in Settings; demo videos can be turned off too. Finished exercises are logged and
  drills ticked off as you go. *Show list* switches to the list, where you can log exercises with one tap
  ("Done as planned") or different numbers, and start the guided workout from any item.
- **Daily mobility:** five short follow-along routines (7–9 minutes) to loosen up and start the day:
  a *Morning Wake-up Flow* (head to toe), *Upper Back & Thoracic Spine* (rotations, extension over a chair,
  neck half circles), *Shoulder Mobility* (circles, shoulder CARs, dislocates, chest and lat stretches),
  *Hip Mobility* (90/90, hip CARs, World's Greatest Stretch, pigeon, frog) and *Legs & Ankles* (leg swings,
  hamstring floss, ankle work, calf stretches). They play in the same guided player as workouts, with a
  demo of every move, timers and the announcer. Home suggests one each day (something you haven't done
  lately, or one that suits what you trained yesterday), and finished routines appear in History. They
  count toward your streak but don't replace the day's workout.
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

Requires Node.js 20.19+ (22/24 LTS recommended). The repo is an npm workspaces monorepo: run everything from
the root, where one `npm install` sets up the shared core, the web app and the phone app.

```bash
npm install
npm run dev        # web app at http://localhost:5173
npm run dev:lan    # also serves on your network, so you can open it on your phone (same Wi-Fi)
npm run mobile     # phone app (see below)
npm test           # data-integrity + logic tests (Vitest)
npm run typecheck  # all three packages
npm run build      # web: typecheck + production build into apps/web/dist/
npm run check:videos  # confirms every how-to video still exists and allows embedding (needs internet)
```

`apps/web/dist/` is a static site. Host it anywhere (Netlify, Vercel, GitHub Pages, or any static server). It
uses hash routing (`#/trees/push/pushup`), so no server rewrites are needed. Build from the repo root, since the
web app imports `packages/core`. Vercel picks this up from `vercel.json`; on other hosts set the build command to
`npm run build` and the output directory to `apps/web/dist`.

### The phone app (`apps/mobile`)

A native Android and iOS app built with [Expo](https://expo.dev) (React Native), with its own phone UI:

- **Today:** today's workout in a big card with a Start button, your streak, the areas you train and a
  length picker showing the estimated time.
- **Guided workout:** a full-screen player with a big rep count or countdown, a REST screen with "+15 s",
  "Skip rest" and what's up next, and a voice coach that reads it all out. The screen stays on, and finished
  exercises are logged automatically.
- **Skills:** every tree, its progressions as ladders, and each exercise's plan, logger, history, cues and
  how-to video.
- **History** and **Me** (Google Drive sync, units, voice coach, reminders, reset).
- **Reminders:** a notification on your streak's last day (6 pm and 10 pm, until you train) and an optional
  daily reminder at a time you pick, skipped once you've trained. The phone schedules them itself, so they work
  offline and nothing goes through a server.
- **Home screen widget (Android):** your streak and today's workout (or the one in progress) at a glance. Tap it
  to open Today. Long-press the home screen → Widgets → Ascent to add it.

It uses the same progression engine, workout generator and saved format as the web app, and syncs with the
same Google Drive files (see below).

> **In OneDrive, keep the folder on this device.** The app's bundler (Metro) can't see files that OneDrive has
> made online-only ("Unable to resolve react/jsx-runtime"), so right-click the project folder → **Always keep on
> this device**. Building the native Android app (`npm run android`) also needs a short folder path, because
> Android's native build names files after their full path and Windows stops at 260 characters: the repo folder
> must be at most about 25 characters long, like `C:\dev\WorkoutAssistant`. From a longer path, build it in the
> cloud with EAS instead (see below). That's only needed when native packages or `app.json` plugins change;
> otherwise `npm run mobile` is enough.

**Try it on your phone (no Mac or Android Studio needed):** install **Expo Go** from the App Store or Google
Play, run `npm run mobile` on your computer, and scan the QR code (with the Camera app on iPhone, or Expo Go on
Android). Your phone and computer need to be on the same Wi-Fi.

**Store builds:** [EAS Build](https://docs.expo.dev/build/introduction/) builds the iOS and Android apps in the
cloud, so iOS builds don't need a Mac. Publishing needs an Apple Developer account ($99/year) and a Google Play
developer account ($25 once). The app ids are `com.omeedthomas.ascent` (`apps/mobile/app.json`); change them
before the first store build if you want different ones, since they can't change afterwards.

#### Testing on an Android emulator (Windows)

Needs JDK 17, the Android SDK (`%LOCALAPPDATA%\Android\Sdk`, with `ANDROID_HOME` set) and a virtual device;
this machine has them, with a Pixel 8 on Android 16 called `Pixel_8_API_36` (Google Play image, so Google
sign-in works). The emulator also needs **Windows Hypervisor Platform**, which takes an administrator PowerShell
once, then a restart:

```powershell
Enable-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -All
```

Then:

```bash
emulator -avd Pixel_8_API_36        # start the virtual phone
npm run android -w @ascent/mobile   # build the development app, install it on the emulator, start the bundler
```

`emulator -accel-check` should report WHPX as "installed and usable". The first build takes several minutes;
after that `npm run mobile` is enough unless native dependencies change. `npm run android` only regenerates
`apps/mobile/android/` when it's missing, so delete that folder after changing `app.json`, `app.config.ts` or
the plugins in `apps/mobile/plugins/` (one of them, `withShortCmakeObjectPaths`, keeps native build paths under
Windows' limit).

#### Testing on iPhone

Apple's iOS Simulator only runs on a Mac, so from Windows:

- **Expo Go on a real iPhone:** `npm run mobile` and scan the QR code. Everything works except Google Drive sync,
  which needs native code Expo Go doesn't include.
- **iOS Simulator build in the cloud:** `npx eas-cli build -p ios --profile ios-simulator` (a free Expo account,
  no Apple account needed). Run the result on a Mac's simulator, or in the browser with a service like
  [Appetize.io](https://appetize.io).
- **Development build on a real iPhone:** `npx eas-cli build -p ios --profile development` (needs an Apple
  Developer account).

#### Google Drive sync on the phone

The Me tab signs in with Google's native SDKs and syncs with the same `My Drive/Ascent/` files as the website,
through the same engine (`packages/core/src/cloud`): it merges on sign-in, saves each change, and picks up other
devices' changes when you open the app or tap **Sync now**. Unlike the browser, the phone keeps access by
itself, so there's no hourly reconnect.

Set it up in the **same Google Cloud project** as the website's OAuth client, so all three count as one app
and can see each other's files:

1. **APIs & Services → Credentials → Create credentials → OAuth client ID → Android:** package name
   `com.omeedthomas.ascent`, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (the development
   build's debug key; add your release key's SHA-1 too before publishing). Its client id isn't needed anywhere:
   Google recognizes the app by its package name and signing key.
2. **iOS** (only for iPhone builds): another OAuth client ID of type iOS with bundle ID `com.omeedthomas.ascent`.
3. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the
   website's client id (the same value as `VITE_GOOGLE_CLIENT_ID`), and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` to the
   iOS one.
4. Rebuild the development app (`npm run android -w @ascent/mobile`). If the consent screen is in **Testing**,
   your Google account must be listed as a test user.

To try syncing without Google, set `EXPO_PUBLIC_CLOUD_MOCK=true` in `.env.local`: a fake "Test User" whose
"Drive" is stored on the device.

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
5. **Add the client id:** copy `apps/web/.env.example` to `apps/web/.env.local` and set
   `VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com`. The id isn't secret, and
   `.env.local` is gitignored anyway.
6. **Restart** `npm run dev`. A *Sign in* button appears in the header and in Settings.
7. **When you're ready for others:**
   - Set `VITE_CONTACT_EMAIL` in `.env.local`. This is the contact address shown on the Privacy Policy and
     Terms of Service pages.
   - Build, then deploy the `apps/web/dist/` folder to any HTTPS static host (Netlify, Vercel, Cloudflare Pages,
     GitHub Pages…). Add that address to the authorized JavaScript origins.
   - On the *Branding* page, fill in the home page (`https://<your-site>/`), privacy policy
     (`https://<your-site>/#/privacy`) and terms of service (`https://<your-site>/#/terms`) links, and add
     your site's domain under *Authorized domains*.
   - *Publish* the app on the Audience page. Until then, only the listed test users can sign in.

### Privacy Policy and Terms of Service

Both live in the app, at `#/privacy` and `#/terms` (`src/pages/LegalPages.tsx`), and are linked from
Settings and the sign-in prompt. They describe exactly what the app does: data stays in the browser and the
user's own Drive, it requests only the `drive.file` scope, and it follows Google's Limited Use requirements.
Update them, and `LEGAL_UPDATED` in `apps/web/src/data/legal.ts`, whenever that changes. Have them reviewed before
publishing; they're a starting draft, not legal advice.

Sign-in needs `localhost` or HTTPS. To test on your phone, use the deployed site rather than
`http://<your-LAN-IP>`.

### How syncing works (`packages/core/src/cloud/`)

- **First sign-in:** anything already on the device is uploaded. If the Drive already has Ascent data
  (from another device), the two are **merged**: mastered skills, sessions, goals and workouts from both,
  with nothing lost.
- **After that:** each change writes only the files that changed (usually just today's) a moment after
  you make it. Coming back to the app re-reads Drive to pick up your other devices' changes. Only files
  changed since the last sync are downloaded.
- **Access lasts about an hour, and renews itself.** A browser app with no server only gets short-lived
  Google access and no refresh token, and Google only hands out a new one in response to a tap. So with
  **Stay connected** on (Settings → Account, on by default), Ascent renews access on your next tap once it's
  within 5 minutes of running out, or has. You don't sign in again or press anything; at most a Google window
  flashes open and closes. Until then everything keeps working and saving on the device. If the renewal
  can't happen (a blocked pop-up, or the setting is off), the header shows **Reconnect**. Fully silent
  background renewal would need a small backend that stores refresh tokens.
- **Offline:** changes stay on the device and upload when you're back. If you close the app first,
  they're merged on your next visit.
- **Signing out** clears this device's copy, so the next person who uses the browser starts fresh.
  Everything stays in your Drive.

**Trying it without Google:** run `VITE_CLOUD_MOCK=true npm run dev` (PowerShell:
`$env:VITE_CLOUD_MOCK='true'; npm run dev`). This gives you a fake "Test User" whose "Drive" is
`localStorage`. Set `localStorage['ascent:mock-expired'] = '1'` to try expired access (the next tap renews
it; `ascent:mock-renewals` counts renewals). It's development only and never included in production builds.

## Project layout

```
packages/core/        @ascent/core: shared by both apps (plain TypeScript, no browser or phone APIs)
 src/
  data/
    types.ts          TreeDef → TrackDef → StepDef (authoring format) and the flattened Exercise
    trees/*.ts        One file per skill tree (all exercise content lives here)
    index.ts          Builds the catalog: resolves prerequisites, dependents, tracks
    videos.ts         One YouTube how-to video per exercise (and per drill that isn't also an exercise)
    drills.ts         Warm-up, cooldown and mobility drills, with timers for the timed ones
    routines.ts       Daily mobility routines (lists of drills)
    equipment.ts      Equipment you can own, and household stand-ins
    splits.ts         Training-day groupings and weekly schedules
    catalog.test.ts   Guards the data: ids exist, no cycles, difficulty never decreases along a path
  lib/
    graph.ts          Status (mastered/ready/locked), ancestors, goal paths, session suggestions
    progression.ts    Next-session prescriptions from your logged history
    workout.ts        Daily workout generator and suggested training day
    equipment.ts      What you can do with your equipment, and the closest alternatives
    guided.ts         Turns a started workout or a routine into guided steps (sets, sides, rest) and announcer lines
    routines.ts       Which routines were done when, and today's suggested routine
    history.ts        Per-day summaries, streaks, rep growth, body-weight goal progress
    calories.ts       Calorie estimates (MET values × body weight × time)
    units.ts          lb/kg conversion and plate rounding (weights are stored in kg)
  cloud/
    driveStore.ts     Google Drive files: Ascent/, progress.json, workouts/<day> <workout>.json
    documents.ts      Progress ⇄ documents (one per training day), and the minimal diff
    syncEngine.ts     Reconcile on sign-in, push changes, pull other devices' changes, reconnect
    merge.ts          Lossless merge of two copies of progress
  state/
    progress.ts       Pure reducer, validation of stored/imported data
    activeWorkout.ts  The started workout (a snapshot for the day)
  portable.test.ts    Keeps browser, React and phone APIs out of core

apps/web/             @ascent/web: the web app (React + Vite)
 src/
  lib/                router.ts (hash router), layout.ts (dagre map layout), announcer.ts (browser speech)
  cloud/              drive.ts (Google sign-in), mock.ts (dev-only fake accounts), metaStore.ts, config
  state/              ProgressContext (localStorage, synced across tabs), CloudContext, activeWorkout storage
  components/         SkillMap (React Flow), SkillNode, SkillList, SkillDetail, GuidedPlayer, DailyMobility, nav, toast…
  pages/              Train, Workout, Mobility, History, Trees, Starting point, Equipment, Settings, legal pages
  styles/             Plain CSS with design tokens in base.css
  assets/trees/       Home card photos

apps/mobile/          @ascent/mobile: the Android/iOS app (Expo, React Native)
 src/
  app/                Screens (Expo Router): (tabs)/ Today, Skills, History, Me; tree/[id], exercise/[id], workout
  state/              Progress, started workout, preferences (AsyncStorage) and CloudContext (Drive sync)
  cloud/              Google Sign-In + Drive backend, dev mock, sync bookkeeping on the phone
  lib/                useGuidedPlayer (the workout player's state machine), coach (voice + haptics), dialogs
  components/ui.tsx   Cards, buttons, chips, steppers…
  theme.ts            The same colors as the web app

scripts/check-videos.mjs   Confirms every video exists and allows embedding
```

## Adding or changing progressions

Everything is data in `packages/core/src/data/trees/*.ts`. A **track** is a linear progression, and each step automatically
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

Steps that need equipment list it with `equipment: ['pullup-bar', 'rings']` (any one of them will do), and can
suggest `alternatives: ['…']` (exercise ids) for people without it. A tree's `kind` is `'skill'` or `'therapy'`,
which decides the Home section it appears in.

To add a whole new tree, create a `TreeDef` file, add its id to `TreeId` in `types.ts`, add it to the
`trees` array in `data/index.ts` and to `BLOCK_OF` in `lib/workout.ts`, and give it a Home card photo in the web
app (`apps/web/src/assets/trees/` + `apps/web/src/data/treeImages.ts`). Data changes reach both apps.

### Videos

Videos live in `packages/core/src/data/videos.ts`, keyed by exercise id:

```ts
'pushup': { youtubeId: 'IODxDxX7oi4', title: 'The Perfect Push Up | Do it right!', channel: 'Calisthenicmovement' },
```

To swap one, take the 11-character id from a YouTube URL (`youtube.com/watch?v=<id>`), update the title and
channel, then run `npm run check:videos`. Some uploaders turn off embedding, and the check catches that. Every new
exercise needs a video entry, or `npm test` will fail. Warm-up and cooldown drills either reuse an exercise's video
(`exercise: 'cat-cow'` in `drills.ts`) or have their own entry in `drillVideos`; every drill needs one or the other.

## Stack

React 19, TypeScript, Vite, Google Identity Services + the Google Drive API for accounts, [React Flow](https://reactflow.dev) (`@xyflow/react`) for the map,
[dagre](https://github.com/dagrejs/dagre) for automatic layout, lucide icons, and Vitest. The phone app uses
Expo SDK 58 (React Native 0.88) with Expo Router, expo-speech, expo-haptics and AsyncStorage. npm workspaces tie
the three packages together.

## Photo credits

The Home skill-card photos (`apps/web/src/assets/trees/`, 640 × 640 crops) are from [Unsplash](https://unsplash.com),
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
| Breakdance | Michael Afonso | [unsplash.com/photos/z8Tul255kGg](https://unsplash.com/photos/z8Tul255kGg) |
| Shoulder Rehab | Margaret Young | [unsplash.com/photos/ocNf_njy6JA](https://unsplash.com/photos/ocNf_njy6JA) |
| Lower Back | Margaret Young | [unsplash.com/photos/970jpIINVU0](https://unsplash.com/photos/970jpIINVU0) |
| Hips | silvia_berger | [unsplash.com/photos/gwEtNJKjepY](https://unsplash.com/photos/gwEtNJKjepY) |
| Mobility | Yazid N | [unsplash.com/photos/-GdW_D027rM](https://unsplash.com/photos/-GdW_D027rM) |

To swap one, replace the file in `apps/web/src/assets/trees/` (a square WebP works best) and update this table.
