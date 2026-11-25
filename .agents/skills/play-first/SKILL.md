---
name: play-first
description: >
  Works one item of the play-first lane, the lane that makes the game playable
  for the owner: take the next item in docs/play-first/ORDER.md, build it in
  its time box to its You-will-see line, push constantly, and leave a handoff
  line. Use when started with the play-first prompt or given a play-stop-* or
  play-first-* item. Not for other pool items (session-start) or merging
  (merger).
---

# Play first

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Scenes are graded against Wildermyth (`OWNER-DECISIONS.md`, Oct 26): the story moves through the scene and hands the player back with something changed. Before any owner question, do the full reading (`OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `LAW.md`, a `docs/` search) and end it with the reading line. Election day is the player's choice, discrimination is yes, Developer ID and licenses are not blockers: none of these is asked again.

**Current as of Nov 10 (owner's rulings of Nov 3 and Nov 10).** The lane's order is still `docs/play-first/ORDER.md`. How any agent takes, builds and hands off a pool item on any tool is `docs/pool/START-A-BUILDER.md`; where this skill and that page differ on claiming or handoff, the page wins. Three changes from the Oct 24 and Oct 25 rulings below:

- An item is built only if it carries `checked: fable` and `standard: 2`, and its Cause does not say `Needs cause.` (`.agents/rules/pool-item-standard.md`).
- **The item's pull request is its thread.** Progress, questions, send-backs and the handoff note go on that pull request. `PROGRESS.md` stays the lane's log for the CTO's pass, but a handoff that is only there is not enough.
- **Your screenshots close the PR; a second session closes the item** (owner, Nov 3), not the owner's own installed-build check. Staging defects for full-body people are not filed while busts are coming (owner, Nov 10; `room-spots` (people-pack part)).

The owner has never been able to play his game. This lane fixes that, one bounded item at a time, run by many agents of different models in turn. **The owner is a file, not a session:** his rulings are `docs/play-first/LAW.md`, the order is `ORDER.md`, where the last agent stopped is `PROGRESS.md`. Nothing lives in your memory or anyone else's.

## The one acceptance

The owner, on the installed Mac build, from **New game → Start a life** in a drawn town, reaches election night, votes in his own race, is told on screen whether he won, and never hits a locked screen. Every screen is free of developer text, every conversation has real choices, and the person on screen is the one he made.

## Start

1. Read `AGENTS.md`, then `docs/play-first/README.md`, `LAW.md`, `ORDER.md` and `PROGRESS.md`, then the CTO section of the channel `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`: send the CTO your questions for the owner, and message the session whose work meets yours, listed in `docs/coordination/CREW.md`, before building in its area (owner, Oct 29); the record stays in the three files on main and on the item's pull request).
2. Take the first line of `ORDER.md` that `PROGRESS.md` does not show as done or as pushed in the last 3 hours, and whose item's `after:` items are done. Never work a blocked parent; work its `-a` or `-b`.
3. Claim it: `npm run pool -- claim <id> --branch play-first/<id>` (the same script as `node --import tsx scripts/pool/index.ts`). Taking over an older handoff: claim with that branch, check it out, `git merge origin/main`.
4. Read the item file: What, Rules (the `LAW.md` sections it serves), Done when, Time box, You will see, Screenshot, Files, Notes.
5. Take the **before** screenshot first: the bench (`npm run bench`, `/play`) at 1440×900, a place drawn from all 56, place and seed written down.

## Work

- Build to the **You will see** line, nothing wider. The **Time box** is a hard stop.
- **Push every 30 minutes or every green step,** whichever comes first, with a plain `git push`. Work not on GitHub does not exist.
- **Open a draft PR at the first push.** Line 1: `Pool item: <id>`. Then the gate line, then the before screenshot (the after replaces its placeholder when it exists), then the rest of `.github/PULL_REQUEST_TEMPLATE.md`.
- You change the files your item names; the lane is the only writer in `src/bench` until the owner lifts it. You may edit the code and data in `src/director`, `src/english` and `data/english` directly for your item (owner, Oct 24): write `Review: words` in the PR body; the Words session reviews, and a merger never sends a lane PR back for touching them. **Not the lines under `data/english/parts/`: only the Story session writes, changes or deletes those (owner, Nov 10, "Split by role").** List the lines you need on the pull request. A line a rule pulls (`data/english/pulled.json`) is rewritten by Story, not you. A `src/core2` change is a pool item for that area's lead (`lead: <role>`): add it, write `needs-from: <lead> <item id>` in your handoff line, and build the screen side against what the engine gives today.
- A screenshot is the acceptance for every play item (the old `browser-visual-acceptance` skill, folded in here Oct 24): a full-window, lossless 1440×900 capture a human can judge; green tests never stand in for it; sharp assets are never blurred to match a backdrop; when a source image is too small, say so and give the size needed.
- **Browser checks that time something** (#6918, Checker 3's send-back): mark the start on the page's own clock (`waitForFunction(() => cond && performance.now(), null, { polling: "raf" })`), wait past the deadline, then count `performance.getEntriesByType("resource")` entries whose `responseEnd` is within it. The page writes an entry a moment after the response ends, so reading at the deadline misses some. Raise the buffer first (`performance.setResourceTimingBufferSize(100000)`), or entries past 250 are dropped. A `waitForFunction` predicate must be synchronous: an `async` one returns a promise, which is truthy at once. A check prints its `Seed:` first and takes the seed back for a replay (the Custom world reads `#seed`, filled before `#new-world`).
- **Escape in play opens Options**; it does not close a sheet. Close one with `[data-testid="sheet-close"]`.
- **A check that walks menus** (Lane 4, Nov 4, `menus-no-scroll.browser.mjs`): before each click, append a marker element to `#sheet-body` and wait until it is gone, or you measure the sheet that was there before (a tab's records arrive after the click). Read something that may not exist (the chosen tab) with `page.evaluate(() => document.querySelector(...))`, never `locator(...).getAttribute`, which waits out the whole default timeout on a sheet without it.
- **To see a test's `console.log`** (the place, seed and record ids for the PR body), run vitest with `--disableConsoleIntercept`.
- **Before the PR** (Lane 4, Nov 4: #7206, #7220 and #7227 were fixes to Lane 4's merged work): a release declaration's id must not already be in `docs/release/consumed-changes.json` (an old pool item's id may be); `PersonId` is imported from `src/core2/types.ts`; and read every changed `.ts` file's lines for type errors, since the release build's typecheck stops on any of them. Run only your own tests; the checker runs `npm run typecheck` and the gate (owner, Oct 29).
- **A new import in `src/bench`** (Lane 4, Nov 4: #7231 and #7244 each turned main's guards red): run `npx vitest run tests/guards/families.test.ts tests/guards/kit-only-ui.test.ts` before the PR. Import another family through its entry file (`src/core2/places.ts`, not `place-lookup.ts`), and build markup only with a kit part from `src/bench/ui/`, never `document.createElement` in `play.mjs`.
- **A state-file push to main** (Lane 4, Nov 4: a `git commit -am` on the state branch carried a half-built browser check onto main unreviewed): name the file, `git commit docs/lanes/state/lane-4.md -m ...`, and run `git status` first; work in progress stays on its own branch.
- `LAW.md` is not negotiable. If the item's text disagrees with it, follow `LAW.md` and say so in the PR body and the handoff line.
- Never use dev mode to get past something. A stop you can't get past is a defect: file it.
- No helpers unless your prompt says so (a helper works in a sparse copy: `helper-checkout`).
- Never rebase, never force-push, never amend a pushed commit, never merge your own PR.

## Done

- **Done when** is a screenshot of the installed build, or of the bench at 1440×900, from a drawn place, with the place and seed under it. A test alone is not done.
- **It must read well, not just be present.** Done-when lines that only check that names or ids appear let rejected work through (Oct 26: play-first-10 named the family and the owner called the entry worthless; play-first-09 counted numbers and he said "That's not a speech"). Every lane PR carries a "Screen text checked" line (`player-screen-text`) and names its mock line (`screen-to-mock`); every scene or talk carries a "Scene standard" row (`scene-standard`). A scene the player cannot reach on the golden path is not a play item.
- **An owner "remove it" or "fix it" line stays a check until it is gone in the screenshot.** Before the PR, read the newest `docs/coordination/playtest/` note and the earlier sittings for every line about the screen you touched, and list each beside your after screenshot as gone or fixed (Oct 28 playtest: the News subheading rows, the Campaigns summary block, the native scroller and the double background fade were each reported "still" there after the owner had said so before).
- **Before creating a shared file, look for its name on main.** `git fetch origin main && git ls-tree origin/main <path>`: two sessions in one day each made `src/english/screen-words.ts` and both PRs hit an add/add conflict that mergers send back and never hand-merge. If it exists, extend it; if another open PR makes it, say so in your body and stack on that PR (Oct 27: #6382, #6394).
- **A change to the title or its controls updates the desktop smoke test in the same PR.** `desktop/scripts/smoke-test.mjs` lists the title backdrops and clicks title controls by test id; moving a control (New world into Advanced) or adding a backdrop (the Lincoln Memorial) without it fails Package desktop release on every platform and blocks the owner's builds (Oct 27: #6209 and #6275, each fixed after hours of red main). Run `grep -n "testid\|backdrop" desktop/scripts/smoke-test.mjs` against your diff.
- **A flaky browser check gets its cause fixed, not its check loosened** (Oct 27, #6265: two mergers' seeds showed the News list and the toast read two different feeds; one shared `storyHeadline` function fixed both and the browser check passed 3 of 3 unchanged). Reproduce on a bench restarted on the head, find the shared cause, then fix it once.
- **No menu pages, none says Continue or Back** (owner, Oct 28 point 22, asked three times; Oct 29). A menu body that holds more than it shows scrolls inside its panel under the game's own thin gold scroller (`scrollbar-width: thin` plus the `::-webkit-scrollbar` thumb, in `play.css`; never the system's), and the screen itself never scrolls. Kept on purpose: the creator's step Back and Continue, election night's Continue and the talk box's Continue (the narrator's beat). `src/bench/no-continue-back.browser.mjs` opens every rail sheet, every tab and a person card and fails on a control that reads exactly Continue or Back outside the talk box. Run any new sheet through it, and replay a world with `BENCH_SEED=<seed>` (it rewrites the `/api/newlife` call's seed) so before and after show the same place.
- **The browser check.** `npm run bench` runs `src/bench/server.ts` on port 3000 (`BENCH_PORT` overrides it); play is at `/play`, dev mode beside it. Start with the Place field empty so the place is drawn, and write down the place and seed the title shows. Run the check for your screen, `node src/bench/<screen>.browser.mjs` with `BENCH_BROWSER` pointing at Chromium (there are checks for calendar, campaign, character, jobs, money, news, options, party, people, person-card, politics, sheets and travel; `no-scroll` covers every sheet; add one for a new screen in the same pattern). Then look yourself: click and keyboard-activate every control you changed; check fit (main screens don't scroll), people and props touching or overlapping, sharpness, leftover overlays, and hit areas matching what's drawn. Name every visible problem; green automation never overrides a visible failure.
- **In a cloud session the browser is at `/opt/pw-browsers/chromium`.** Run a check as `BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/<name>.browser.mjs`; without it the checks look for `/usr/bin/chromium` and fail at launch. A check that fails in one drawn place and passes in another is telling you about the place: replay the failing seed before blaming the screen (Nov 10: the party check failed only where the player's party held no office; the cause was the Parties screen's list, not the styles under test).
- Since Oct 29 the checker for your PR runs the gate (`merger` (checker part)); you run only the tests and the browser check for what you changed, then tell the checker the PR number (a message, plus a comment on the PR). For reference, the gate is (`local-gate`): typecheck, eslint and prettier on changed files, the tests for changed files, `npm run zero-dice`, `npm run release:check -- --mode pr`, `npm run pool -- --check`. Write the gate line.
- **Screenshots in a PR body do not render from a session** (Oct 29): the platform wraps every URL a session posts, image links included, in backticks, so `![](url)` and bare links both come out as code. Commit the screenshots under `docs/play-first/shots/<item>/` with a README naming the place and seed, say the path in the body, and tell the checker; the owner and mergers open the files on the branch. Do not spend time fixing a body's image tags; `gh api -X PATCH` goes through the same wrapper.
- Fill the **Done when** table, the before and after screenshots with place and seed, and **Removed**. Add a release declaration in `docs/release/changes/`.
- Mark the PR ready and set the item: `npm run pool -- status <id> in-pr --pr N`. Mergers take lane PRs first (`docs/coordination/MERGE-FIRST.md`, line 1) and send back a lane PR without before and after screenshots; they never send one back for director or English code edits (`Review: words`). They do send one back for a line you wrote under `data/english/parts/` (owner, Nov 10).
- **Your screenshots close the PR; a second session's check closes the item** (owner, Oct 25: "remove that block"; owner, Nov 3: nothing is done until a second session replays its finish line on main; `done-proof` (seen-in-game part)). The merger merges on your before/after screenshots and its checks; `npm run pool -- seen` by a session that did not build it sets the item done. Never write "OWNER SCREENSHOT NEEDED"; it is not a merge gate.

## Stop (every time, for any reason)

Before you stop (done, time box spent, usage out, blocked, the environment restarting), first add a comment starting "Handoff:" on the item's pull request (what is done, what is not, how to run the proof, the next step; `docs/pool/START-A-BUILDER.md`), then add one line at the top of the log in `docs/play-first/PROGRESS.md`, in the shape `HANDOFF-TEMPLATE.md` gives, **on main only, never on your branch** (acting CTO, Oct 25): `git checkout main && git pull`, append, commit `play-first: handoff <item>`, push, then check your branch out again. If main refuses you, comment the line on your PR and the CTO copies it. A branch that changes `PROGRESS.md` is a defect; the merger drops the hunk:

```
- <UTC YYYY-MM-DD HH:MM> · <agent/model> · <item id> · <branch> · <last push sha> · <state> · <next step> · <blocking>
```

State is one of `started`, `pushed`, `PR opened #N`, `ready for recheck #N`, `blocked`, `done #N`. If the time box ran out, push what exists, keep the draft PR, and make the next step exact (a file and line, or a command). If the item turned out bigger than its box, split it: add `<id>-a` and `<id>-b` items (`-b` with `after:` `-a`), each four hours or less, and say so in the line.

## Cloud environments

Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command; never ask the owner to confirm it. On the owner's Mac: no clone, no `git worktree add`, no `npm ci`.

## More in this folder

Read each file here when its moment comes:

- `references/bench-and-browser.md`: when a browser check times out or fails, the bench shows old code, a claim did not take, or main refuses your handoff push.
- `references/reaching-a-stranger.md`: when your proof needs a person the player has not met.
- `references/prompt.md`: when you start an agent on the lane.
