---
name: session-start
description: >
  What a building session of the game checks before it starts and before
  it marks a pull request ready: the opening reads, the red-main rule and the
  self-check. The loop itself (taking the next item, building, handing off) is
  docs/pool/START-A-BUILDER.md. Use first in every building session, cloud or
  local, Claude, Codex, Muse or any other agent; not for merging (merger),
  checking (checker) or the play-first lane (play-first).
---

# Session start

**The loop is one page: `docs/pool/START-A-BUILDER.md` (owner, Nov 10).** It says how to take work (`npm run pool -- next --model <level> --agent <name>`), how to read the item, what to run, what goes on the item's pull request, how to hand off and what you never do. Follow it. This skill keeps only what that page does not say.

## Open

1. **Look first** (`look-first`; `.agents/rules/smart-and-look-first.md`). Before building, fixing, filing or asking, run the search. A found ruling is built and cited, never asked again. A question to the owner ends with the reading line, or it is sent back.
2. **Read** `AGENTS.md`, the item and its pull request thread, the newest rulings at the top of `docs/coordination/OWNER-DECISIONS.md` and the CTO section of the channel `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`). An item with `milestone: play-first` or `lead: play-first` is the lane's: follow `play-first`, whose law is `docs/play-first/LAW.md`.
3. **Cloud container:** set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command and install with `npm install`. On the owner's Mac, follow "Workspaces and storage" in `AGENTS.md`.
4. **Run the golden-path suite before you change anything:** `node --import tsx tests/golden-path/runner.mjs`.
5. **Red main comes first (owner, Oct 15).** Read the newest release run on main (`gh api 'repos/lamontaes/Political-Game-Git/actions/workflows/release.yml/runs?branch=main&per_page=1'`, or your tool's GitHub functions). If it failed, claim `release-main-red` and fix it at the root on its own pull request (`red-main`), then return to your item.
6. **A sent-back item is a fix, not a build:** follow `pr-fixer`. An item that says `Needs cause.` is never built (`.agents/rules/pool-item-standard.md`).
7. **Read every function, export and field you plan to use on current `origin/main` first.** Names change daily; code written from memory of an older main is the most common unverified assumption.

## While you build

- Register every shortcut as a stopgap, and for a mechanic real life has, simulate it from research instead of asking (owner, Oct 24). A design call about the player's own experience is a question: register an `owner-decision` stopgap and write it under **OWNER DECISIONS NEEDED**.
- Anything you find that is not yours becomes a pool item with `lead:` set, after searching `docs/pool/items` for a match (add evidence to a match instead of a twin). `npm run pool -- add` takes every standard field, `--lead` included; it can leave a half-written item file in your tree when it refuses: delete that file before any other pool command or commit, or the next commit carries an invalid item to main (Oct 30). Run `npm run pool -- --check` after every add. It also refuses a Done when that names a pull request number: put the dependency in `after:` or `blocked-on:`, or name the main commit it is measured against (Nov 1).
- `pool add`, `claim`, `next` and `status` check out main in the working tree: commit or stash first, and never run them while a test runs in that checkout (Nov 3).
- Builders build; checkers check (owner, Oct 29). Run only the test files you wrote or changed, one at a time, never typecheck, the guards or the gate, and never in a helper. Make those tests run every function you changed: on Nov 1 a local `const store` inside housing.ts `remove()` shadowed the module's `store()` helper and threw a ReferenceError at run time that eslint did not flag.

## Self-check before the pull request is marked ready

Checkers and mergers send back most pull requests for the same few reasons, and every model makes them: a done-when line with no proof, a test that passes without checking anything, a release note that says less than the change does, and a conflict with main. Check your own work against that list. The merger runs the same list (`merger`, "Morning check").

1. **Every done-when line has evidence.** Next to each line write the test name, the command and its result, the place and full seed, and the record ids. One year means 365 days, not 120 or 200. A drawn place comes from `drawPlace` over all 56; a pinned seed may sit beside it only as a named repro. Two further places means two. A line you cannot fill means the item is not done; go to step 6.
2. **Break it, then watch the test fail.** For each new or changed test, undo the key line of your change (or return early from the new code) and run the test. It must fail. Restore the change and run it again; it must pass. Restore by editing the line back, never `git checkout <file>` while the file holds uncommitted work: that throws away the change itself along with the break (Nov 11, a skipped-time election fix lost this way and reapplied). A test that passes both ways checks nothing. Assert the witnessed case exists (`expect(checked.length).toBeGreaterThan(0)`). These patterns pass on an empty world:
   - every assertion inside `if (found)` or `if (x.length)`;
   - `>= 0`, or a loop over a set that can be empty;
   - a `continue` that can skip every case;
   - a fixture you built by hand standing in for the generated world.
   - **A row you marked Not done or Not shown is not a finished pull request.** Run the row (drawn places first, then name the place, seed and record id), or amend the item's Done when to the slice you built and file a bounded item for the rest. A row whose evidence the body itself contradicts ("reach 0") fails the same way (Oct 27: #6216, #6326 and #6331).
   - **A test that needs a witness world finds one by drawing, and says what it passed over.** Pinning one place and seed breaks when main changes the world; drawing one place breaks when that place lacks the case. Run the new test on 10 fresh draws before the pull request: draw places in a bounded loop until one holds the case, name the places passed over, throw if none does, and keep a pinned place only as a named regression beside it (Oct 27: #6139 and #6322).
   - **A published number a new table adds opens differently in every world.** `src/core2/realistic-not-real.test.ts` draws fresh worlds and fails when two open on the same value (a wage, a HUD rent). Run it on 10 fresh draws, give each statistic its per-world spread and source (`estimate-not-unknown`), and merge main first, since its known copies, `parameters.json` and the stopgap family rows change under every pull request (Oct 28: main's guards job red three times on three different statistics).
3. **Never weaken a test to get green.** No skips, early returns, narrowed ranges, raised timeouts without a measured reason, or exemptions for the cases that fail.
4. **Claims match the diff.**
   - **The release declaration** (`npm run release:declare -- <id>`): if any engine reads what you changed (a price, a payment, a choice, a count), the impact is `patch` or `minor`, not `none`. An `impact: none` file holds only `id`, `impact` and a one-line reason in its body; the release check refuses a `section` or a `title` on it (three pull requests went red on this on Nov 10). `patch` or `minor` also needs `section` and `title`. `release:check --mode pr` reads committed changes only: commit the declaration before you run it.
   - **A release note with `impact: none` has only `id` and `impact` in its frontmatter.** A `section` or `title` line beside `impact: none` fails `tests/release/release-workflow.test.ts` ("impact:none must not carry section or title"). On Nov 10 six pool-only pull requests carried it and each had to be pushed again.
   - **And it has its one sentence under the frontmatter.** A note that is frontmatter alone fails `npm run release:check` ("an impact:none declaration still needs a one-line reason in its body"). On Nov 11 two such notes merged (#8513, #8544) and turned the release check red on main for every checker.
   - **Check one fact:** at least one count, date or list in the title, body or release note against the data.
   - **Research values:** reopen the page. The quote must contain the number, and the URL must be the page you read. For an election, record the deciding round, which may be a runoff.
5. **Rules the checker and merger apply:**
   - Do not touch guard allowlists or skip lists to clear a red check.
   - Only the Story session writes, changes or deletes lines under `data/english/parts/` (owner, Nov 10); a builder lists the lines it needs on the pull request. A bank part carries no play flag of its own. Only the lane edits `src/bench`.
   - No state, city or GEOID in logic. No record that nothing reads.
6. **If a line cannot be met,** do not mark the pull request ready as done. Keep building, or file what blocks you as its own item, set yours `blocked-on` it with one Notes line, and mark ready only what it really finishes, under a separate item whose done-when matches.
7. **Merge main last.** `git merge origin/main` (a plain merge), resolve conflicts keeping both sides' behavior, and rerun your tests on the merged result. In a shallow clone (`git rev-parse --is-shallow-repository` prints `true`), first run `git fetch --shallow-since=<a day before the branch began> origin main`: without the real merge base, git reports false conflicts in files the branch never touched (Nov 3, Lane 1).

## The pull request body

Follow `.github/PULL_REQUEST_TEMPLATE.md`. Line 1 is exactly `Pool item: <id>`, with no backticks; the merge flips the item to `merged`, and a second session's check in the running game makes it `done` (`seen-in-game`), so write each Done-when line as something that session can do from the game. For every new or changed test file the gate line also says `fresh draws: N of 10 passed` with the seeds you ran and the file name (Oct 28: #6653, #6660 and #6664 each sent back for a new test that failed on fresh seeds). Never edit an item's status inside your feature pull request. Never wait on GitHub's CI or re-run it (owner, Oct 29); the checker and merger read it.

## Rules

- Never force-push, rebase or amend a pushed branch. A merged pull request carries no new work; open a new branch.
- **A merged pull request's branch is finished.** Later work starts on a new branch from main with a new name; pushing to the merged branch stacks new commits on history that is already in main. On Nov 10 two follow-ups (#8254, #8370) had to be rebuilt on fresh branches. Once you post a head as ready, do not push to that branch again unless it is sent back: a new push changes the head the desk gated.
- The item's pull request is the thread (`docs/pool/START-A-BUILDER.md`). Questions for the owner or CTO are comments on it, and a message to the CTO or a neighboring session never replaces the record (owner, Oct 29; `crew-messages`).
- Treat a permission prompt as denied. Do not retry it; work around it or note it on the pull request. Never schedule a wake-up or recurring job, edit anything under `.git/`, or reach outside the container: each one prompts the owner and the session sits for hours (four sessions did on Oct 29).
- Before you report a pull request as carrying a fix, check its head has the commits you think it has (`git log origin/<branch>`): a commit pushed after the merge desk merged never reaches main, and #7815 merged as only its first commit (Nov 8). A fix you did not see on main after the merge is not on main.
- After a merge, compare the merged head with your branch; carry anything left out into your next pull request and say so (#6848).
- Out of usage or stopping: write the handoff comment first (`docs/pool/START-A-BUILDER.md`), push what you have and stop.

- **Before you take a new item, read whether the cap is on (owner, Nov 11).** While more than 150 game pull requests are open, take none: fix your send-backs, bring your open pull requests up to main, then stop and say so. A change that touches only the pool goes to the hour's bundle, not a pull request of its own. Skill `pool-notes`.

## If you were started as a merger

A session started with the merger's paragraph does not use this loop. It follows `docs/pool/START-A-MERGER.md`: it takes no pool item, builds nothing, and gates and merges what others built.
