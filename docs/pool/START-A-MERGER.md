# Start a merger

Owner, Nov 11, 2026: "you and Fable make a merge command, just like we talked about with the build command yesterday. So have Fable make sure it's detailed, the skills are all updated, etc., and I can start that in Codex." And: "be sure you have a communication channel with Codex."

This page is for any agent, on any tool or account, with no context: Codex first, Claude, Muse or another. It tells you how to take the pull requests that are built, check each one, and merge it or send it back. It uses only git, npm and `gh` (or your tool's own GitHub functions). You build nothing new.

## The command to paste

The owner pastes this as it is. Nothing in it is filled in by him:

> You are a merger for the game in lamontaes/Political-Game-Git. Read `AGENTS.md`, then `docs/pool/START-A-MERGER.md`, and follow that page exactly. Work in a cloud checkout, never a second copy on the owner's Mac; set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command; run `npm install` once, never `npm ci`. Check in: run `npm run pool -- check-in --as` followed by, in quotes, the model you are running on and the tool you are running in. It gives you a name. Find out what you can do, then post one line on issue #8928: `Merger <name>: online; can merge yes/no/unknown; can comment yes/no`. If you cannot comment, write every line you would post to `docs/coordination/merger-log.md` on the branch `merger/log` and push after each line. Then loop. Each pass: read the new comments on #8928 and act on every line starting `CTO:` that names Merger or all desks (a build hold means merge and push nothing until `CTO: build published`). Take the next pull request in the page's order. Gate it on main merged into its head, as the page says, never a lighter gate. A pull request that changes lines the player reads merges only with its scenes on screen before and after in three drawn places and the owner's complaint it answers. If it passes and its head is still the commit you checked, merge it with `gh pr merge <number> --squash --admin --match-head-commit <sha>` (or your tool's own merge function, pinned to that commit the same way) and post `Merger <name>: merged #<number> <sha>`. If it fails, comment once on the pull request with the failing check, the place and the seed, and post `Merger <name>: sent back #<number>` with the reason. Run a failing test on clean main with the same seed before you blame a pull request. If a merge is refused, post `Merger <name>: blocked` with the exact command and its error, never work around it, and keep gating and posting `Merger <name>: ready #<number> <sha>` lines for the CTO to merge. Never merge #8054, #8055, #8056, #8057, #8071, #8074 or #8083, a pull request that only adds the owner's voice notes or CTO notes, or one you wrote. Never force-push and never build new items. Post a line every hour even when nothing merged, and a `Merger <name>: handoff` line before your usage runs out.

**The admin flag (owner, Nov 11, about 5:10 p.m.: "let them"):** main's branch rule makes a plain merge wait for GitHub's own checks, which can sit in a queue for hours. A merger merges with `--admin`, only after this page's full gate and only pinned to the exact sha it checked. Never for a held pull request, a draft or one it wrote. If the head moved after the gate, it gates again. The CTO spot-checks a merger's merges from time to time.

## Before the first pull request

1. **Where you run.** In a cloud container with a checkout of the repository (Codex cloud, a Claude cloud session). On the owner's Mac, never make another copy: read `.agents/rules/storage-and-workspaces.md`. In a cloud container, every npm, npx and node command runs with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` set, and you never ask the owner to confirm it.
2. **Install once:** `npm install`. Never `npm ci`.
3. **Read:** `AGENTS.md` ("Standing owner rules", "Process"), then the skills `merger`, `checker`, `merge-trains` and `pool-notes` under `.agents/skills/<name>/SKILL.md`. This page is the order of work; the skills hold the traps.
4. **Check in:** `npm run pool -- check-in --as "<your model and your tool>"`, for example `--as "GPT-5 Codex in Codex cloud"`. It answers with a name. You are `Merger <name>` in every line you post.
5. **Find out what you can do**, without changing anything:
   - **Comment:** post your online line (below). If the post is refused, you cannot comment.
   - **Merge:** `gh pr view <any open number> --json mergeable` shows you can read. Whether you can merge you learn at the first merge. Write `can merge unknown` in the online line until then. After the first merge or refusal, post a second line, `Merger <name>: can merge yes` or `can merge no`; never edit the first.

## Talking to the CTO

The CTO speaks for the owner (owner, Oct 29: "The CTO's word is my word"). Issue #8928 is the one channel. #7365 was the line until Nov 12, 2026; it is near GitHub's comment cap.

- **Inbox.** At the start of every pass, read the comments on #8928 that are newer than the last one you read: `gh api "repos/lamontaes/Political-Game-Git/issues/8928/comments?since=<the time of your last read, ISO>&per_page=100"`. Add `--jq '.[] | "\(.created_at) \(.body[0:300])"'` to see each comment's first lines. Never read the whole issue with a tool that returns every comment: it holds more than 1,500 and the read is refused as too large. Act on every line that starts `CTO:` and names `Merger`, your name, or all desks. The ones you will meet:
  - `CTO: build hold`: merge nothing and push nothing to main, pool commands included, until `CTO: build published`.
  - `CTO: hold #N`: do not merge that pull request until `CTO: release #N`.
  - `CTO: merge first #N`: gate that one next.
  - `CTO: stop`: finish the check you are in, post your handoff line, and stop.
  - A line that starts `Fable B:` or `Gate desk` or `Train` is the crew's, not an order; read it for heads that are ready (below).
- **Outbox.** Every result is one line on #8928 that starts `Merger <name>:`:
  - `Merger <name>: online; can merge yes/no/unknown; can comment yes/no` (your first line)
  - `Merger <name>: merged #N <full sha>`
  - `Merger <name>: ready #N <full sha>` (gated and passed, when you cannot merge)
  - `Merger <name>: sent back #N` and the reason in one sentence
  - `Merger <name>: blocked` and the exact command and its error
  - `Merger <name>: alive, N gated, M waiting` (every hour when nothing else was posted)
  - `Merger <name>: handoff` and the state (below)
- **When you cannot comment.** Some setups can push branches and cannot comment. Then append the same lines, each with its UTC time, to `docs/coordination/merger-log.md` on the branch `merger/log` (make the branch from main the first time) and push after every line. The CTO reads that branch. Send-backs still have to reach the pull request: put the send-back text in the log and say `cannot comment on #N`.
- **Never go silent.** A line every hour, whatever happened.
- Every comment you post ends with a line `---` and then `_Generated by <your tool>_`.

## Where to start, and the order

Start from the newest `Fable B: handoff` line on #8928 and the open pull requests. Then, every pass, take the first of these that has something in it:

1. **A red on main.** Once an hour, read the newest runs on main: `gh run list --branch main --limit 10`, or `gh api "repos/lamontaes/Political-Game-Git/actions/runs?branch=main&per_page=10" --jq '.workflow_runs[] | "\(.name) \(.conclusion) \(.head_sha[0:10])"'`. A pull request whose first line is `Touches pool item: release-main-red`, or whose title starts `Red main`, goes first.
2. **Rules, checks and skills** (owner, Nov 10: "anytime there's a rule or a check or a skill, just have it merge it before anything else"): a pull request that changes `.agents/rules/`, `.agents/skills/` and its `.claude/skills/` mirror, a test, a guard, a workflow, or `data/english/line-rules.json`.
3. **The hour's pool notes** (branch `pool/notes-<date>-<HH>`, one pull request an hour; skill `pool-notes`).
4. **What the player sees first:** screens, scenes and words, the newest ready first.
5. **Engines** and everything else, oldest ready first.

A pull request is yours to gate when it is open, not a draft, its base is `main`, and you did not write it. Skip a pull request another desk says it is gating in a line newer than an hour. A pull request with a `Gate desk N: ready #N <sha>` or `Train <area> ...: ready` line whose sha is still its head has been gated by a desk: check the head, the base and the never-merge list, and merge it pinned without gating it again.

## The gate, step by step

One pull request at a time, in your own checkout. Never wait on GitHub's checks and never run the whole test suite. This list is for a pull request that changes the game, a rule, a check or a skill. The hour's pool notes have their own, shorter gate ("The hourly pool notes", below), and that section is the whole gate for them.

1. **Base and head.** The base is `main`. Read the head's full sha from GitHub (`gh pr view <N> --json headRefOid,baseRefName,isDraft,mergeable`). That sha is the one you check and the one you merge.
2. **Fetch the head, then merge main in, locally.** A pull request's branch is not in your checkout until you fetch it, every time: `git fetch origin main && git fetch origin pull/<N>/head && git checkout -B gate-<N> FETCH_HEAD && git merge --no-edit origin/main`. Check that `git rev-parse FETCH_HEAD` is the sha GitHub gave you. Never push this local merge: the merge is pinned to the pull request's own head. The one exception is a mechanical fix you make yourself ("Sending back"), which you push to the pull request's branch and then check again from the new head. Delete `gate-<N>` when you are done with it. A conflict in a file a command writes (`docs/pool/INDEX.md`, the pulled-lines file) or a bank keyed by piece id is merged the way the skill `generated-file-merges` says. Any other conflict is a send-back.
3. **The release declaration.** Every pull request adds one file under `docs/release/changes/`. A note with `impact: none` has no `section` and no `title`, and its body is one line.
4. **The changed files' checks.** `npm run agent:test-cadence` lists the commands for the files the pull request changed. Run them: prettier and eslint on the changed files, and each changed or named test file, one at a time.
5. **Typecheck.** `NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/dev-lab/typecheck.ts`, and read its exit code. Never pipe `tsc` through `grep`: it prints nothing both when the code is clean and when the compiler ran out of memory.
6. **The guards:** the guard suite on the merged result, `npx vitest run --dir . tests/guards --maxWorkers=2` (every file under `tests/guards`), then `npm run zero-dice`, `npm run old-imports`, `npm run pool -- --check`, and `npm run test:skill-ops` when a skill or `AGENTS.md` changed. A guard that fails the same way on clean main at the same seed is main's (step 10). A merge or ready record with no guard-suite line is a light gate and does not merge (CTO, Nov 12: #8329 merged without it and broke `families` and `daily-register` on main).
7. **The release check:** `npm run release:check -- --mode push` on the merged result.
8. **No game run at merge (owner, Nov 12, about 3:30 p.m.: each pull request's changed files plus the 2-minute guard tests, for every merger).** Do not run the golden path or the whole test suite to merge. The scheduled checks on main run the game, and the Red desk fixes what they find. Run a golden-path row only when the pull request changes that row's own test, and then compare with clean main as step 10 says.
9. **Browser checks, for a pull request that changes a screen** (anything under `src/bench` that a page loads): start the bench (`npm run bench`, port 3000), then run the pull request's own `*.browser.mjs` checks and `panels.browser.mjs` with `BENCH_BROWSER` set to your Chromium. Restart the bench when server code or `src/bench/data/controls.json` changed.
10. **A failure by seed.** When a test fails, write down the test, the place and the seed, and run the same test with the same seed on clean main (name the commit of main you ran). If it fails there too it is a red on main: say so in a `Merger <name>: red on main by draw` line with the test, place and seed, and do not hold the pull request for it. If it passes on main, it is the pull request's.
11. **The head again.** Read the head's sha once more. If it moved while you checked, start over on the new head.

## The words bar

Owner, Nov 11, 2:03 a.m., through the CTO. A pull request that changes lines the player reads (anything under `data/english/`, or a string a screen shows) merges only when its body or its `docs/seen/` folder holds:

- the scene on screen before and after, at 1440x900, in three drawn places named with their seeds;
- the lines as played;
- the owner's complaint it answers, quoted with its date.

Then the gate adds: `tests/english-parts-banks.test.ts` and `tests/guards/english` on the merged result, and `npm run words:rules` run twice with no file changed the second time. **Never merge words on a lighter gate.** Nobody waives the bar but the CTO, in a `CTO:` line. The lines under `data/english/parts/` are the Words builders' to write; you never edit them, even to fix a failure.

## Trains by area

When more than about five pull requests are ready in one area (screens, engines, words), follow the skill `merge-trains`: the light checks on each one, then the heavy checks once on a branch that holds the area's passed pull requests in merge order, halving a red train to find the one that broke it. Post the train as one comment listing each rider with its full sha, read from GitHub, never a commit you made locally. Then merge the riders top to bottom, each with its own pinned command. A rider whose head moved is skipped and named.

## Merging

- **A timeout is not a pass (CTO, Nov 12, after #8524):** A golden-path timeout or an unreached accepted row is not a pass, even when the diff touches only tests or docs. Re-run it (alone if the machine is loaded) and merge only after every row passes on the merged result.
- **One plain command, pinned:** `gh pr merge <N> --squash --admin --match-head-commit <full sha>`. Never a merge without the pin, never auto-merge. `--admin` only after the full gate (owner, Nov 11; see the top of this page).
- **Where `gh` cannot merge** (a Claude cloud session, for one), use the tool's own GitHub merge function with the same pin. In Claude Code that is `merge_pull_request` on the GitHub server, loaded with ToolSearch first, with `merge_method: "squash"` and `expectedHeadSha: "<full sha>"`.
- **If the pin does not match,** the merge is refused because the head moved. That is not `blocked`: read the new head and gate it again from step 1.
- **Never merge:** #8054, #8055, #8056, #8057, #8071, #8074, #8083; a pull request that only adds the owner's voice notes or CTO notes; a draft; a pull request you wrote; a pull request that changes a workflow or a release script unless a `CTO:` line names it.
- **A refusal is final.** If the merge command is refused (no permission, a required check, a policy), post `Merger <name>: blocked` with the exact command and the exact error, and stop trying to merge. Do not look for another way. Keep gating, and post `Merger <name>: ready #N <full sha>` for each pull request that passes: the CTO merges from those lines.
- **After a merge,** post the merged line at once, then read main's newest run. If it turns red, post `Merger <name>: red after #N` with the failing check.
- **A build hold** (`CTO: build hold`) stops every merge and every push to main, pool commands included, until `CTO: build published`. Gating goes on.

## The hourly pool notes

Pool-only changes ride one branch an hour, `pool/notes-<date>-<HH>`, with one pull request (skill `pool-notes`). When a line on #8928 says the hour's notes are cut and gives the head: merge main in locally, run `npm run pool -- --check`, and merge it pinned to that head. Nothing else is checked on a notes bundle. A notes pull request that touches any file outside `docs/pool/` and `docs/release/changes/` is sent back.

## Stale runs

GitHub's runs are never waited on, but a deep queue starves the build. Once an hour, not once a pull request, and in the background: list the queued runs (`gh api "repos/lamontaes/Political-Game-Git/actions/runs?status=queued&per_page=100"`), and for every `pull_request` run whose `head_sha` is no longer the newest commit of an open pull request, `gh api -X POST repos/lamontaes/Political-Game-Git/actions/runs/<id>/force-cancel`. Keep every `push` and `workflow_dispatch` run. `scripts/merger/cancel-stale-runs.sh` does this; it only lists what it would cancel until you add `--go`.

## Sending back

One comment on the pull request, exact and complete, so its builder needs nothing else:

- the check that failed, as the command you ran;
- the place and the seed, and the commit of main you compared with;
- the failing line or the first lines of the error;
- what would make it pass, if you know.

Then one line on #8928: `Merger <name>: sent back #N` and the reason in a sentence. You fix only what is mechanical (a conflict in a generated file, prettier, a release note's shape) and say that you did; then the head you push is the head you check and merge. Anything that needs judgment goes back to its builder.

## Stopping

Before your usage runs out, or when the CTO says stop, post `Merger <name>: handoff` with three lists: gated and ready with each full sha; waiting on a gate; sent back with each reason. Push any branch you changed. You never build a new item, never take a pool item, and never run `npm run pool -- next`.
