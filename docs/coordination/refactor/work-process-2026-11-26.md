# The work process, refactored (Nov 26, 2026, overnight; the CTO's working file)

**The owner, Nov 26, about 2:40 a.m.:** "Essentially what I'm asking you to do is refactor the GitHub or the work process or whatever ... whether it's a tool, literally the work process, whether it's removing a shit ton of files from main, or getting a plan to get only, like a shipped client, like what that would come with a game, like only those files, full deletion ... I want you to actually dig into the code ... You are me while I'm asleep. Just don't start any sessions unless you're replacing one of these cloud sessions that stop working."

Every number below was measured on main `ea60e9eb` or `f2352113` (Nov 26), from the tree, the workflow files, run logs and GraphQL. Nothing is estimated unless it says so.

## 1. What the repository holds

| Area | Files | Size | What it is |
|---|---|---|---|
| docs | 12,906 | 1,588 MB | 1,387 MB of it is 1,710 PNG screenshots: proof pictures for play-first items (667 MB) and seen-in-game checks (552 MB) |
| art | 5,049 | 686 MB | backdrops 293 MB, busts 157 MB, people engine 137 MB, campuses 71 MB |
| data | 855 | 442 MB | raw research sources 339 MB (148 files), research 94 MB, English banks 7 MB |
| src | 3,281 | 102 MB | the game: 975 source files and 1,734 tests; 16 MB of it is generated reference data |
| public | 43 | 87 MB | shipped as is; 78 MB is 4 files in `public/education` |
| scripts | 542 | 4 MB | tooling |
| **Total** | **23,114** | **2,918 MB** | git history on GitHub: 10.4 GB |

**What the game ships:** `npm run build` makes `dist/client` from one entry, `src/bench/play.html`. Vite bundles what it imports, plus `public/`. The desktop shell (`desktop/electron-builder.yml`) packages `staged/client` and `staged/play-api`, and `desktop/scripts/stage.mjs` copies `dist/client` there. Its own comment says the compiled client is "3+ GiB with private people", so art also comes from outside the repo. Nothing in docs, data/source, data/research, tests or scripts ships, and nothing yet lists which repo files the client actually reads.

## 2. How CI runs a pull request

| What | Measured |
|---|---|
| Workflows | 17; 16 active (Release package was disabled by hand) |
| Required for main | `validate` and `golden-path` only (branch protection; no reviews; admins not enforced) |
| Started by one non-docs PR | validate (repository, guards, 1 to 6 unit shards, ui-look, tests-load), M0 guards (golden-path, golden-path-year, core-changes, paired-performance), new game, audit scan, instruction checks, checks guard |
| Hourly on main | validate at :07, M0 guards at :37 |
| Nightly | heavy (full suite) 4:41 UTC, twenty-year 2:17 UTC, every place 7:41 UTC, unrun files |
| One job's time (#10642 repository) | 3 min 34 s: checkout 2 min 41 s, npm ci 45 s, **the check itself 1 s** |
| Why checkout is slow | 11 checkouts use `fetch-depth: 0` (the full history of 10,299 branches and 10.4 GB). A plain checkout took 36 s. Heavy's `slowest` job, already a partial clone, took 1 s. |
| Full suite | runs only on `train/` PRs, the schedule and dispatch. On Nov 24, 140 test files failed on main, and 216 on Nov 25; 71 failed on both nights, 47 of them with the same first error (`main-full-suite-triage-2026-11-26.md`) |

**The owner's ruling, Nov 18:** "Fast checks + lane proof", with the whole-game plays "once per train." Only heavy was moved to trains. Golden-path and golden-path-year (35 min each) and new game (20 min) still run on every non-docs PR. Golden-path is a required check, so the move needs care (Part 5).

## 3. Branches and pull requests

| What | Count |
|---|---|
| Branches | 10,299 |
| ...whose PR merged, with the tip unchanged since | 6,704 |
| ...whose PR closed unmerged, with the tip unchanged | 1,859 |
| ...whose PR closed but the branch moved after | 417 |
| ...with no PR ever | 1,060 (599 from October, 359 from November) |
| ...that are an open PR's head or base | 243 |
| PRs: open / merged / closed | 240 / 8,432 / 1,955 |

The list of 8,563 cleanup candidates, with each branch's sha and PR, is in `branch-candidates-2026-11-26.json` beside this file.

## 4. The pool and the process docs

- **Pool:** 4,856 items: 1,318 open, 10 claimed, 367 in-pr, 419 merged, 25 blocked, 1,999 done and 718 dropped. Its generated index is 935 KB.
- **AGENTS.md:** 40.8 KB.
- **Rules:** 17 files in `.agents/rules` (54 KB).
- **Skills:** 45 in the repo, from 2 KB (`news-writer`) to 173 KB (`words-engine`).

## 5a. Findings from the deep reads (Nov 26, 2:50 to 3:05 a.m.)

1. **CI is spent on setup, not on checks.** One job's own check took 1 second. Checkout took 2 min 41 s, because 11 checkouts fetch the full history of 10,299 branches. At 2:55 a.m. the Actions queue held 31 runs waiting and 23 running.
   - **Fix 1:** partial clones (#10649 pilots one job).
   - **Fix 2:** the whole-game plays once per train, as he ruled Nov 18 (#10650).
   - **Fix 3:** delete merged-PR branches. That was refused by auto mode tonight and needs him (below).
2. **No one owns main's nightly reds.** Three nightlies report on main: the full suite (216 failing files Nov 25), twenty years and unrun files (red Nov 25). The red-main skill reads them, but no session runs it. Of the 71 files red both nights, 47 fail the same way, so they're breaks, not luck. Each break came from a merge whose changed-file tests never ran that file.
   - **Fix:** after each nightly run, a job lists the failing files missing from a committed known-red list (which may only shrink) and posts them, each with its engine's owner from `families.json`. The morning CTO wake hands each one to a session or the pool. Building it needs a session with a checkout; it's in the Fable audit goal.
3. **The repo is 2.9 GB, and about 1.9 GB of it never ships.**
   - **Ships:** what `src/bench/play.html` imports, plus `public/` and the bundled art. The art is live: all 1,024 manifest backdrops are used, and the 1,929 unlisted files are occluders. `scripts/world/check-data-shipping.mjs` already keeps research and real names out of the bundle.
   - **Doesn't ship:**
     - proof screenshots in docs, 1,387 MB;
     - raw research sources, 339 MB in `data/source` with artifact locks;
     - research, 94 MB in `data/research`;
     - old reports, lanes, codex and archive docs, about 260 MB.
4. **Skills tell sessions to commit proof screenshots into main.** play-first, screen-to-mock, merger's train-gate reference, words-engine checks and room-spots all point at `docs/play-first/shots`. That is why docs grow by hundreds of MB a month.
   - **Fix:** proof screenshots go on the PR itself (an image in the body, or a CI artifact), never into main. A guard refuses new image files under `docs/` above a small size. The 1,456 files (1,005 MB) with no live owner are deleted in one PR that also updates the 26 live pointers.
5. **AGENTS.md was stale on the crew thread and the train** (#10651 fixes both facts). It still describes the October crew of mergers and fixers that no longer runs. That part needs his read before rewriting.
6. **243 open PRs:**
   - 50 are main-based and untouched for more than 7 days;
   - 30 target dead trains (`train/nov17b` 24, `train/nov18` 6), and can never reach main;
   - 8 target `claude/story-cut-before-nov15`.

   Closing them needs his yes. The lists are `stale-prs-2026-11-26.json` and `prs-on-dead-bases-2026-11-26.json` beside this file.

## 6. The plan for "only what a shipped game needs"

1. **Measure what ships:** a build step writes the module and asset list Vite actually bundled to `dist/shipped-files.json`, uploaded by the Release build. Not done tonight: it changes `vite.config.ts`, and no PR check runs a build.
2. **Sort every repo file into one of four groups:**
   - ships;
   - builds or tests the game (`src` tests, `tests/`, the scripts that `package.json`, the workflows or tests call, `.github`, `desktop`, config);
   - runs the crew (AGENTS.md, `.agents`, `.claude`, the pool's live items, current coordination docs, `docs/play-first` LAW/ORDER, `docs/design`);
   - neither.
3. **Delete "neither" from main in batches,** each with its pointer cleanup. Git keeps the history. Big binary research data moves to Drive, with its artifact locks kept so generators can fetch it.
4. **Guards keep it that way:** no new images under docs, and the known-red list for the full suite.

## 5. Done tonight, ready, and waiting for the owner

Updated through the night. See the log for times.

**Done:**
- The proof rules were made to match the Nov 18 ruling (`docs/coordination/refactor/check-in.md` on the decisions branch).
- `train/nov26-a` was created.
- #10643 (talk merge plan, docs) merged.

**Piloting:** #10649, a partial clone for validate's `repository` job.

**Prepared, not merged (his call or riskier):**
- golden-path and new game moved to trains;
- stale PR closes;
- PNG proof deletions.
