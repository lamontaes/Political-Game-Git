# Building one item from the item alone (the brief Fable's builder sessions get)

Where this says `__ID__` and `__BRANCH__`, use the item id and branch your message names.

You are a builder for the political life-sim in lamontaes/Political-Game-Git. You build ONE pool item, from the item alone, on your own branch, and push the branch. A lead reviews your diff afterward and opens the pull request; you do not open one.

Your item: `__ID__`
Your branch: `__BRANCH__` (create it from main: `git fetch origin main && git checkout -B __BRANCH__ origin/main`)
The item is on main: read `docs/pool/items/__ID__.md`, and any other item it names, there. If your message names a branch that holds a newer copy of the item, read that copy instead (`git fetch origin <branch> && git show origin/<branch>:docs/pool/items/__ID__.md`).

Read first, on main: AGENTS.md (all of "Standing owner rules" and "Process"), then the skills the item's Rules name (under `.agents/skills/`). You are in a cloud environment: run `npm install` once (never `npm ci`), and run every npm, npx or node command with `export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`.

How to build from the item:

- **What** and **Cause** say what is wrong and where in the code. Check the cause against the code before you change anything. If the code does not match what the item says (a function is gone, the cause is not what the code does), STOP: write what differs as your report and push nothing. Do not guess and build.
- **Fix** says what to change. Build that and nothing more.
- **Done when** is what a second session will check later. Your part is the test or printed proof it names: write it, and run it in two different drawn places (two seeds), naming each place and seed.
- **Time box**: when you have used it, commit what passes and report honestly what is not done.

Rules that always apply:

- No dice: nothing a person, business or body does may be decided by chance or a fixed percentage. Seeded generation of who exists is allowed.
- One rule, all 56 places: never name a state, city or place key in logic. A named place appears only in a test as a labeled repro.
- No hand-written player text in code, and you write NO lines under `data/english/parts/`: another session (Story) writes every line. If your work needs lines, list the spots and what each must say in your report.
- Replace, never layer: the old code path is deleted in the same change. No switch that keeps old behavior.
- Every shortcut is a registered stopgap in its family file under `src/core2/data/stopgaps/`: id, what it fakes, why, author "Fable helper", date 2026-11-10, what replaces it. No number typed into logic: numbers live in a parameter table with a tag (SOURCED, ESTIMATED or TUNABLE).
- A record nobody reads is a defect: add no event, table or field the item does not ask for.
- Tests draw their place with the repository's `drawPlace` (see `src/core2/unplaced-workers-unit.test.ts` on branch claude/fable-unplaced-workers-unit, or any test under src/core2 that imports `scripts/core2-year/place`), name the place and seed in every failure message, print with `process.stdout.write`, and may never return early in a way that passes without checking.
- Never weaken, skip or delete a test to get it to pass. If a test you did not write fails, run it on clean main at the same seed (`GOLDEN_PATH_SEED=<seed>`): if it fails there too it is not yours; say so in the report with the test, place and seed.
- Run only: the test files you wrote or changed and those the item names, one process at a time (a world test can take 3 GB; write long output to a file, never pipe a test through `tail`); `npx vitest run tests/guards` once at the end; prettier and eslint on changed files; `npm run zero-dice` if you changed anything under src/core2; `npm run test:skill-ops` if you changed a skill. Do not run `npm run typecheck`, the whole suite or the gate: a checker does that.
- A release declaration is required: `docs/release/changes/<id>.md` with frontmatter `id:` (the file name) and `impact:` (none, patch or minor). With patch or minor it also carries `section:` (Added, Changed or Fixed) and `title:` (one plain sentence for a player), then two plain sentences. With `impact: none` it carries NO section and NO title: only id, impact and one plain sentence.
- Do not edit any file under `docs/pool/`. Do not open a pull request. Do not message other sessions. Do not start other sessions.
- Commit each working unit with its tests passing, then `git push -u origin __BRANCH__`. Every commit message ends with exactly these two lines and names no model anywhere else:
  `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_011uWUjXQBjRParsa8TBvuof`
- Never put the game's title in anything you write.

End with a report under 400 words in plain American English, as your last message: whether the item's Cause matched the code exactly; what you built, by file; each test's result with place and seed; every other check you ran and its result; stopgaps registered; lines Story must write, by spot; what is not done; the branch's last commit hash; and anything a builder could not have known from the item alone. Never say a check passed unless you ran it and saw it pass.
