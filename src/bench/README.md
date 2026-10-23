# The bench

Current as of 2026-10-23 (checked by the Oct 23 doc audit: every path resolves and no replaced rule is stated)

Run `npm run bench` and open forwarded port 3000.

- **`/play`** is the game screen on the new core. Press **New life**.
- **`/dev`** (also `/`) is Dev mode, the owner's test bench and an early-access
  player feature. On the play screen, turn on the developer ring
  (top right) and choose **Dev mode** in the menu. It works on the world being played; **New world** builds another one
  from any seed (empty for a random place among all 56).

## Dev mode

Every control goes through the core's own calls and leaves a `dev-mode-change`
record on the core; `devModeMarks(core)` lists them so a release save can
refuse a world that carries them. Reading spends no game time and writes
nothing.

- **Laws:** every series the law data knows, at each level of the place, with
  the row in force, pending rows and the combined value. **Set** or **Repeal**
  enacts a real law row through `enactLaw` (now, or on the date given), marked
  `provenance: dev-mode`, and shows who it reached.
- **Decisions:** any person (a counted one is filled in when picked) and the
  choices the core offers them today (`availableActs`). Picking one makes it
  their next decision through the chooser's controller hook. **Bodies** lists
  the bills before each body: cast any member's vote (`castMemberVote`), hold
  the vote now (`holdVote`), or sign or veto (`executiveDecision`).
- **Time:** Day, Week, Month, Year or To date run the world on its own clock
  (`advanceCore`). The played character finishes its day first; the play
  screen binds the clock again on its next move.
- **Trace:** any record id through `resolveSavedTraceV1` (director moments
  too), with the record itself; **Person** shows money, job and pay changes,
  views, drives, health, relationships, recent records and the director's
  ledger.
- **Watch:** public and private pay by month with each change marked, the
  town's monthly measures, the national rows, budgets, price rules and news.
- **Experiments:** saved change sets (`data/dev-experiments.json`, plus any
  saved from the page into `.bench-local/`). **Apply** makes the changes
  today; **Run** applies them and runs the experiment's months.

Code: `dev-mode.ts` (the controls), `dev-api.ts` (routes, mounted from
`server.ts`), `dev.html` and `dev.mjs` (the page, in Kit 12's look).

Checks: `npx vitest run src/bench/dev-mode.test.ts` (a random place and seed;
`DEV_MODE_SEED` repeats one), `npx vitest run src/bench/player.test.ts`, and
`npx tsc -p src/bench/tsconfig.json`.
