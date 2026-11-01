---
name: checker
description: >
  Runs Our Civic Duty's checker role (owner, Oct 29): five Sonnet sessions
  that take every pull request after its builder opens it, merge main in, run
  the local gate (typecheck, eslint, prettier, release check, zero-dice, the
  pool check, the changed tests on fresh draws), fix what is mechanical, send
  the rest back to the builder, and hand a passed gate to the mergers. Use
  when started as a checker or given a PR to check; not for building (the
  builders), reviewing the done-when or merging (merger).
---

# Checker

**The rule (owner, Oct 29):** "Start 5 new Sonnet sessions that are explicitly like type check or doing like the prep work for the mergers after coding. So that way the builders can strictly build." And: "if they have helpers, type check apparently takes a long time... I wouldn't mind offloading those." Builders build and open the PR; the checker runs every check on it in its own container; the merger reviews and merges. Typecheck is the heaviest check (several minutes and several gigabytes of memory), so it runs here, never in a builder's helper.

## Your share

- Five checkers, numbered 0 to 4 (`docs/coordination/CREW.md`). Checker _k_ takes open, ready PRs whose number mod 5 is _k_, oldest first. When your share is empty, take the oldest unchecked PR in any share and say so in your comment, so two checkers never run the same head.
- The builder messages you the PR number when it opens one. Also list open PRs at the start of every pass (`mcp__github__list_pull_requests`, state open), because a message can be lost.
- A PR is checked when it carries your `Checker` comment naming its current head. Recheck when the builder or a merger sends a new commit.
- Skip drafts, skills-only PRs (the CTO merges them at once, Oct 29) and PRs whose line 1 is `Touches pool item: release-main-red-standing` (the red-main fixer gates its own, since it is ahead of everything).

## Who writes on the branch

From the moment a PR is open and ready, the builder has moved to its next unit and **you are the one writer on that branch** until it merges (one writer per branch, `AGENTS.md`). A builder that needs to push more messages you first; you finish or stop your run, then hand the branch back. Never force-push, rebase or amend; plain merges and plain commits only.

## The check

1. `git fetch origin <branch> main`, check out the branch, `git merge origin/main` (plain merge). Resolve conflicts exactly as the merger skill says (docs, `stopgaps.json`, pool items, `docs/pool/INDEX.md`, matrices). A conflict in code logic goes back to the builder.
2. Run the local gate on the merged result, every line, in this container with `NODE_OPTIONS=--max-old-space-size=8192` and `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`:
   - `npm run typecheck`
   - `npx eslint <changed files>` and `npx prettier --check <changed files>`
   - `npm run release:check -- --mode pr`, `npm run zero-dice`, `npm run pool -- --check` (only the PR's own items count), `npm run old-imports` when `src/core2` changed
   - the PR's new or changed test files (`npm run agent:test-cadence` lists them), each new or changed test on **three fresh drawn places** with the seeds named; the PR's browser check when it changed a screen
   - `npm run test:skill-ops` when instruction files changed
3. Read the PR's CI checks on GitHub (validate, golden-path, M0 guards, Release) as one more input; they run on GitHub's machines by themselves, so never wait on them before you finish your own run, and never re-run them to kick them. A red CI job your gate did not cover is a failure like any other.
4. A failure that also fails on clean `origin/main` does not block: name it and the red-main fixer's item in your comment.

## Traps (Oct 29)

- **Fetch the branch again before you push or comment.** A merger can merge main into the branch, or merge the PR, while your gate runs (a full check takes 20+ minutes; #6794 merged mid-check). Run `git fetch origin <branch>` and `git merge-base --is-ancestor origin/<branch> origin/main` just before pushing; if the head moved, push nothing and check the new head's differences only.
- **A fresh clone is shallow.** `release:check` fails with "Needed a single revision" until `git fetch --unshallow origin`.
- **Regenerating the law matrices only reorders evidence** (glob order); if the counts equal main's plus the PR's, `git checkout` the file back rather than commit churn.

## Fix or send back

- **Fix yourself, as plain commits on the branch:** prettier and eslint `--fix` output, a missing or malformed release declaration, the `Pool item:` line, pool item paperwork, a spelling-guard hit, a stale count in the body, and a type error whose fix is local and obvious (a missing import, a renamed field, a null check the type already demands). Each fix keeps the builder's behavior exactly; rerun the check it fixes.
- **Send back, never fix:** anything that changes what the code does, a failing test (unless the failure is the test's own typo), a design or rule question, a code conflict, or a fix you cannot finish in 15 minutes. One PR comment starting `Checker <k>:` with the failing command, the file and line, the place and seed, and the one change needed; message the builder session (`CREW.md`) the same line. A sent-back PR goes back to its builder as that builder's next job.
- Never skip, narrow or loosen a test, never raise a timeout without a measured reason, never touch another PR's branch, and never merge.

## Hand-off to the merger

When every line passes, post one comment and update the PR body's gate line:

`Checker <k>: gate passed on head <sha> (main <sha>): typecheck, eslint, prettier, release:check, zero-dice, pool --check, <n> tests incl. fresh draws <place/seed>, <browser check>. Fixed: <what you fixed, or nothing>.`

Then message the merger for the PR's parity (`CREW.md`) with the PR number and head. The merger reviews the diff and the done-when and merges; it does not rerun your gate when the head is unchanged (`merger`).

## Traps from the first pass (Checker 2, Oct 29)

- **One heavy process at a time.** The cloud container has about 15 GB; typecheck plus even two vitest runs got node processes OOM-killed (typecheck then exits 1 with no error text). Run typecheck alone, then the tests one after another. Never `pkill -f vitest` (it matches your own shell).
- **A bare `npx tsc` needs a bigger heap, and its crash is not a pass.** At node's default heap, `npx tsc --noEmit -p tsconfig.app.json` dies with "JavaScript heap out of memory" (exit 134) after about a minute, and a `grep "error TS"` over that output prints nothing, which reads as clean (Oct 30, governing lead: two branches were reported as compiling that way). Run it with `NODE_OPTIONS=--max-old-space-size=6000` and read the exit code and the count of `error TS` lines, never an empty grep.
- **Long tests run in the background with no timeout cap.** Drawn-place proof tests can take 3 to 20 minutes on a draw. Run each seed with `run_in_background`, output to a file, and read the `Tests` line; a `timeout 280` that kills it proves nothing. Do not filter output with grep inside the loop: write the log, then grep the file.
- **`release:check` needs history.** On a shallow clone it fails with "Could not run git rev-parse" or "Cannot relate compared branch point". Run `git fetch --deepen=3000 origin main <branch>` and retry.
- **Seeds.** Drawn tests read their own variable (`GOLDEN_PATH_SEED`, or one named in the test file, such as `CRIME_JUSTICE_2_SEED`); grep `process.env` in the test to find it, then name three seeds in your comment.
- **A fail on a fresh seed that also fails on clean `origin/main`** (check out `origin/main` detached, run the one test with the same seed) does not block; name it, and tell the red-main session by message.
- **A PR that adds or changes an English bank (a file in `data/english/parts/`) also runs `scripts/dialogue-batch/grade-reach.test.ts`.** The banks test and the English guards pass without a register class, but `buildReach` throws `no register class for bank <name>` until `registerClasses` in `data/english/calibration.json` names the bank (Oct 30: #6891 added `bill-paper`, passed the guards, merged, and turned main red).
- **A resolved `stopgaps.json` conflict** where both sides appended rows ends in the same `"status": "open" }`: close the first side's last row, open the second side's rows, then check by script that the ids are unique and every id of `origin/main` is present.
- **Messages.** `SendMessage` does not reach the other sessions; use the claude-code-remote `send_message` tool with the session id from `CREW.md`. A merger may merge a PR you sent back before the builder's fix lands; tell the CTO when it happens.
- **Push to a branch you named, never to a variable.** A push whose branch comes from a variable or a command's output pushes a stray branch when that value is empty or wrong: `x` and `UNKNOWN` landed on origin that way on Oct 30, and no cloud session can delete a branch (the proxy and the permission check refuse). Write the branch name out in the push command, check `git branch --show-current` first, and report a stray push to the CTO at once.

## Traps from the Nov 1 pass (Checker 2)

- **Pool item and index conflicts are mechanical, and the same every time.** Merging main into a builder's branch usually conflicts only in `docs/pool/INDEX.md` (take main's copy, run `npm run pool`) and, when the builder set the item `in-pr`, in the item file itself (keep the branch's `status: in-pr` and `pr: #N`, take nothing else from main's side). Do not regenerate the index on a branch you are only reading, and a stale index that comes from another PR's item is not yours to fix.
- **Three fresh seeds can miss the one that fails.** A merger sent #6907 back on a seed my three draws never hit. Also run the builder's named seeds and any seed a merger or a red names, and for a long drawn test (the 25-minute `circumstance` year test) run the short tests on five seeds and the long one on the seed that failed.
- **`all-places.mjs --world-seeds` draws its own place from each seed.** It does not give the nightly's named places (a hex id printed beside Graysville, Alabama drew Country Knolls, New York). Say which place you ran; to reproduce the nightly use `--only` with the state keys and its run seed. Run the same world seed on clean `origin/main` before blaming or crediting the PR (that is how an unfixed empty cabinet seat showed up: the same two seats empty on main and on the PR).
- **Browser checks rewrite committed screenshots under `docs/`.** After any `*.browser.mjs` run, `git checkout -- docs` so the shots are not committed; a builder's branch may already carry overwritten shots (restore them from main in the merge). Some checks (`guide-menu`, `campaigns-ballot`) need a life already in progress: run `people.browser.mjs` first on the same bench, which starts one.
- **Cold bench starts time out.** The first browser run after a fresh `src/bench/server.ts` start can hit a 60-second wait that a later run on the same tree passes; say so with the counts instead of calling the check passed or failed.
- **Never `pkill -f <pattern>` from a command that contains the pattern.** It matches and kills your own shell (exit 144). Start the server from a script file and kill it by the pid you stored, or by port.
- **A hold from a builder after you handed a PR over** means telling the merger at once (message and PR comment); say the head your gate no longer stands for.
- **Check the merged result's files against the newest main before you push.** Main moves every few minutes. Merge main again, list files that changed on both sides, rerun typecheck, release check and one drawn test only for those, and push with a fast-forward check (`git merge-base --is-ancestor origin/<branch> HEAD`).

## Traps from the Nov 1 pass (Checker 1)

- **Name the head you pushed, and push before you comment.** A push can be rejected because the branch moved (#6881: my comment named a local merge that never landed). Read the `git push` output; on a rejection, fetch, redo the merge on the new head and rerun what the new files touch. A comment that names a head must name one that is on the remote.
- **Check the PR is still open and its head is the one you were sent.** Messages carry stale heads. `git ls-remote origin refs/pull/<n>/head` gives the real one. If merging main leaves `HEAD` equal to `origin/main`, the PR has merged: add a note for the red-main session if you found something, not a gate comment.
- **List the changed files after you commit the merge, not during it.** While a merge has conflicts, `git diff --name-only origin/main HEAD` lists everything main changed. Resolve, commit, then list. Likewise `release:check` does not see a declaration file you have not committed.
- **A builder who asks to push to a branch you hold** (a code conflict in their files, a fix to your send-back) may, by plain push. Answer by message, wait for the new head, then gate that head. A code conflict is theirs to resolve, not yours.
- **Memory-heavy file sets: `--maxWorkers=1`.** Several drawn-place files in one vitest run killed a worker ("Worker exited unexpectedly") and hid which file failed; one worker at a time, in the background, with the log to a file.
- **A bench for a browser check:** start `nohup node --import tsx src/bench/server.ts` from a script, create a life with `curl -X POST "localhost:3000/api/newlife?seed=<seed>"`, set `BENCH_BROWSER=/opt/pw-browsers/chromium`, and run `node src/bench/<name>.browser.mjs` (`polling.browser.mjs` needs `node --import tsx`). A check that fails at the last leg on both the branch and clean `origin/main` is main's; say which leg.
- **A speed PR:** `npm run speed:year -- --seed long-1 --years 4` on the branch, then on `origin/main` detached, one process at a time; compare the record counts per year (they must match) and the seconds. Process memory swings by hundreds of megabytes between runs; the bar is the heap (`speed-work`).
- **How we message is its own skill:** read `crew-messages` before sending a process by message; if the process is not in a skill, put it in the skill first.

## Traps from the Nov 1 pass (Checker 0)

- **A changed-file list includes deleted files.** Build the list for eslint and prettier with `git diff --name-only --diff-filter=ACMR origin/main...HEAD`, or both fail with "no files matching" on a file the PR deleted. A deleted file that `tests/guards/families-baseline.json` still names fails the guard's "only shrinks" test; dropping that line only lowers a count, so it is a mechanical fix, not a loosening.
- **`release:check` reads the committed tree.** An `impact: none` declaration needs a one-line reason in its body, and the check does not see an edit until it is committed. Commit the fix, then rerun.
- **A push rejected as non-fast-forward means another session wrote to the branch** (a checker, a merger or the builder merged main). Fetch, merge theirs, rerun `release:check` and the one drawn test, push, and post a second comment if your first one named a head that is no longer the tip. Name heads from `git rev-parse --short origin/<branch>`, never from memory: one comment named a hash that did not exist.
- **A branch whose diff against current `origin/main` is empty has already merged.** Read the PR's state before you gate it (#6870 and #6935 merged while the pass was running).
- **Browser checks in this container.** Run them with `BENCH_BROWSER=/opt/pw-browsers/chromium`, and restart the bench (start `src/bench/server.ts` as a background job, store its pid, kill that pid) for every fresh draw, because Continue reuses the saved life. A check that needs a life in progress (`politics-people`, `budgets`, `campaigns-ballot`) gets one with `POST /api/newlife?seed=<seed>` on the same bench before it runs. If a check fails the same way on clean `origin/main` under that setup, say you cannot tell the check's own fault from your setup; do not call it passed or failed.
- **Two vitest runs at once crash a worker.** The signature is "Worker exited unexpectedly" and fewer tests passed than the file has. It proves nothing about the PR: rerun that seed alone.
- **A "Test timed out in 30000ms" that also times out on clean `origin/main` at the same seed** is a slow world, not a defect, especially when the same test passes alone with `-t`. Name it and tell the builder to lengthen the timeout; never raise it yourself.
- **Crossed assignments.** When the CTO and another checker both claim a PR, ask the one mid-gate before you start, and tell the CTO who keeps it (`crew-messages`, "When messages cross").
- **A stacked PR carries its base's commits.** Gate the whole stack, say so in the comment, and name the order the mergers must follow. If main merged the base without the PR's own commits, the merge can resurrect release declarations that a release already consumed; check `docs/release/changes` after the merge.

## Traps from the Nov 1 pass (Checker 3)

- **Never chain a push after a piped merge.** `git merge origin/main 2>&1 | tail -1 && git push ...` pushes even when the merge stopped on a conflict, because the pipe's exit status is `tail`'s. Merge on its own line, run `git status --short | grep -E '^(UU|AA)'`, resolve and commit, and only then push (with the fast-forward check). If the merge is still open, nothing was gated.
- **Say "pushed" only after you saw the push line, and read the PR's state first.** A builder or merger can push the same fix, or merge the PR, while your gate runs (#6910 merged at 11:55 while I was gating a local merge of the same two files). Before the comment, fetch the branch and read the PR (`merged`, head sha); a comment that names a push that never happened must be corrected on the PR.
- **Both sides appended at the same spot is a keep-both conflict.** CSS (`src/bench/play.css`: close the first side's last rule, then the second side's block) and `src/core2/data/campaigns/parameters.json` (two new parameters; add the comma) end up with two additions, never one. Check by parsing: `node -e "JSON.parse(...)"` for the JSON, `npx prettier --check` for the CSS. A conflict inside a test body or an engine function is not this kind; it goes back to the builder.
- **A builder's item file may have its claim blanked.** On `in-pr` the item file can carry `claimed-by:` empty while main's has the claim; keep `status: in-pr` and `pr: #N` from the branch and restore the `claimed-by` line from main.
- **Browser checks need three things in a cloud container.** (1) Chromium needs `--no-sandbox`: write a two-line wrapper script that `exec`s `/opt/pw-browsers/chromium --no-sandbox "$@"` and pass it as `BENCH_BROWSER`. (2) Checks differ in how they find the bench: most read `BENCH_PORT`, some read `BENCH_URL` (a full `/play` URL) or hard-code port 3000; start the bench with `node --import tsx src/bench/server.ts` on 3000 and set both. (3) A check that wants a life already running gets one from `curl -X POST "http://localhost:3000/api/newlife?seed=<hex>"` (a fresh random seed per run); a check that creates its own life prints its seed and place, so keep its log. Stop the bench by its stored pid.
- **A check that asserts a precondition of its draw is the check's defect.** "No member of a body to step in as", "no Join button" (a player under voting age), "no race cards" (a place with no races) fail by draw while the screens are fine. Send back: the check must name the unusable draw and take another (a few attempts), never fail on it.
- **Do not switch branches while a background test runs.** The run reads the working tree as it is when each file loads, so a `git checkout` for the next PR makes the last runs test the wrong code. Wait for the run to end (an until-loop on `pgrep -f "vitest run"` from a Monitor), then check out.
- **A single unexplained failure is worth one more run, kept.** Write every run's log to its own file and grep the file afterward; a failure whose place and seed went down a pipe cannot be compared with `origin/main`.

## Traps from Oct 30 to Nov 1 (Checker 4)

- **Stop at a conflict before you run the gate.** `git merge origin/main` can end "Automatic merge failed" and the next commands then run against a half-merged tree (#6964 passed `release:check` that way). Run `git diff --name-only --diff-filter=U` right after the merge; resolve (or `git merge --abort` and send back) before any check.
- **An empty diff means the branch is already in main.** Before the gate run `git merge-base --is-ancestor origin/<branch> origin/main`; if it is, say so and stop (#6954 was merged by the Codex desk while I started). Also guard `npx eslint $F` with `[ -n "$F" ]`: an empty file list lints the whole directory and prints dozens of false errors.
- **A declaration counts only when committed, and `impact: none` is a bare note.** `release:check` reads the committed range, so commit the declaration, then rerun it. For `impact: none` the body needs one line of reason and the front matter must not carry `section` or `title` (#6984, #6989 and #6904 all failed on exactly that): delete those two lines, run prettier on it, commit.
- **A new test that throws on its own draw precondition is a send-back.** A message like "no drawn place had a housemate's filing reach the player" fails on about one draw in three and would turn main red (#6974). Ask the builder to redraw until a place qualifies, name the places passed over, and show 5 fresh draws passing.
- **Withdraw a send-back only on the same draws.** Run counts on different random places say nothing (my 3-of-4 against main's 0-of-3 on #6949 came from different places). The speed lead's records proof across the four places I had drawn did settle it; ask for the same seeds on both sides, or digests per table, before you withdraw.
- **Name the parity once, from the number.** An even PR number goes to Merger 0, an odd one to Merger 1; work it out before you write the comment and write "For Merger 0 (even number)". A hedge like "odd? even: Merger 0" went into four comments; fix a wrong one with `update_issue_comment` on the comment id.
- **A builder who asks to push to a branch you hold** gets an explicit yes and the head to push to; the branch is theirs until they say they are done, then you recheck the new head (Words, #6884, three times). Tell the merger the head each time.

## Stop condition

A pass ends when every PR in your share is checked at its current head or sent back with one comment. Then take the oldest unchecked PR in another share. When nothing is open, message the CTO one line and wait for the next message.
