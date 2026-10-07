# Codex day rules (Oct 7 2026) — every session reads this first

REPORTING (owner, 1:20 p.m.): report in the Google Drive doc "00j CODEX DAY" (id 1ggMaxfWABEaO3MA3RSyELPwKGepkwLdCCrGMBaZK1ps): insert ONE line at the top of its LOG section per check-in, starting "SESSION NN" (READY / CLAIM / BLOCKED / STATUS combined). The CTO reads Drive every check-in and answers there. GitHub is only for branches and PRs (gh pr create / gh pr ready); do NOT post status comments on GitHub issues (the account hits GitHub's posting limits).
NEVER FINISH: when your list is done, you are NOT done. Take the next open row in docs/codex/assignments/POOL.md (verify it against main first; already done → record it), then the next. Your goal only ends when the owner stops you.
NAME (owner, 12:24 p.m.): rename your Codex task/thread to exactly "Session NN" (your number only, e.g. "Session 07"), not what you are doing. Do it now.

Repo: lamontaes/Political-Game-Git. Report in Drive doc 00j (see REPORTING above); GitHub issue #3154 is read-only history. CTO: Claude Opus (posts as "OPUS CTO").
Goal today: MERGE, MERGE, MERGE (20+ merges an hour). Sessions 01–30 build; Sessions 31–32 validate and merge. Finish work, get it onto main, take the next item. Never sit idle.

## GitHub API budget (11:15 a.m. — the limit ran out once already)
- All sessions share ONE GitHub account limit: 5,000 API calls per hour (gh pr/issue/api commands). It hit zero at 11:14 a.m.
- Never poll gh in a loop. Use `git fetch` (not the API) for code and the assignments branch.
- On each check-in: ONE call for new board lines: `gh api "repos/lamontaes/Political-Game-Git/issues/2424/comments?since=<your last check-in time>&per_page=100"`. No other polling.
- Mergers: list PRs once per 10 minutes (one `gh pr list --json ...` call), not per PR.
- (12:35 p.m.) WHY "blocked by GitHub": it is the shared API limit, not a GitHub outage (githubstatus: all operational). 54 sessions share 5,000 API calls an hour; it ran out at 11:14, 11:29 and 12:27. `git fetch` and `git push` do NOT count against it; `gh` commands do.
- MERGERS WHEN THE LIMIT IS OUT (git only, no gh): `git fetch origin main 'refs/pull/*/head:refs/remotes/pr/*'`; for each PR from your last list snapshot that is ready/READY/PASS and not sent back: `git checkout -B m origin/main && git merge --no-ff refs/remotes/pr/N -m "Merge #N: <title>"`, gate the changed files, then `git push origin m:main` (retry once after `git fetch` if main moved). GitHub marks the PR merged when its commits reach main. If the push is refused by branch protection, wait for the reset instead.
- BUILDERS WHEN THE LIMIT IS OUT: keep coding and testing; `git push` your branch (allowed); open the PR and post READY after the reset, or post READY in Drive 00j.
- If gh says "rate limit exceeded": run `gh api rate_limit --jq .resources.core.reset`, keep working locally (code, tests), and retry after the reset. Never retry in a tight loop.

- (12:55 p.m.) POSTING LIMIT: GitHub also limits how many comments/PRs ONE account can create per minute; with 54 sessions we hit it (comments fail with "Something went wrong"). Post at most ONE board line per check-in: combine READY, CLAIM and STATUS into that one line. If a post fails, put it in Drive 00j instead; never retry in a loop.

## Check-in timer (owner order, 11:00 a.m. — every session)
- Set a timer for your check-ins as soon as you start: e.g. `(sleep 600; echo CHECKIN > /tmp/checkin-NN) &` in the background, or your harness's own timer/reminder if it has one.
- When it fires (and after every PR): `git fetch origin assignments`, re-read RULES.md and your session file, read the newest OPUS CTO lines on #3154, fix any SEND BACK on your PRs, post one SESSION NN status line if you have nothing else to post, then RESTART the timer. Never let it lapse.

## Subagents (owner, 11:05 a.m.: Luna is cheap — use it)
- Every session may run up to 4 Luna subagents at once, each on a DIFFERENT item (its own branch and PR). Give each subagent the item, RULES.md, and the gate. You stay responsible for its PR and its READY line ("SESSION NN READY #N (subagent)").
- Use them for: rescuing PRs in parallel, one trait or one law each, one pool row each, one screen each.

## Your loop (repeat until stopped)
1. Read your assignment: `git fetch origin assignments && git show origin/assignments:sessions/session-NN.md` (NN = your number, two digits).
2. Do the top item that is not marked DONE. One item = one branch = one PR, based on current `origin/main`.
3. Gate it (below). If it passes, mark the PR ready (`gh pr ready <N>`); the two merger sessions (31, 32) merge it. Builders never merge.
4. Post one line on #3154: `SESSION NN READY #N: <what the player or the world gets, plain words>`, adding `(SCREEN) shot: <link>` or
   `(ENGLISH) batch: <path>` for items the CTO or the owner must check. Fix any `SEND BACK #N` in place on the same branch, then post READY again.
5. Re-read your assignment file (it changes during the day). If every item is DONE, take the oldest unclaimed row
   in docs/codex/assignments/POOL.md: search #3154 for '<row> CLAIM' first (skip rows claimed in the last 60 minutes or with a merged PR), post `SESSION NN CLAIM <row>`, then work it. A row whose work is already on main: mark it done in your next PR instead.
6. If blocked more than 20 minutes: post `SESSION NN BLOCKED <item>: <exact question>` and move to your next item.

## Mergers (CHANGED 12:24 p.m.: four mergers, split by PR number % 4)
- Session 31: number % 4 == 0 · Session 32: % 4 == 1 · Session 53: % 4 == 2 · Session 54: % 4 == 3. Each reads its session file for the loop.
- Mergers gate ONLY changed files: prettier, eslint, changed tests. Typecheck and release:check never block a merge today.
- PRs named in an "OPUS CTO PASS" line may still be drafts: run `gh pr ready <N>` yourself, then gate and merge. Also take drafts whose author posted READY.
- Do not wait for green GitHub checks.

## Gate (changed files only; no full-suite run, no waiting on GitHub checks)
- `git merge origin/main` into your branch first (no conflicts left).
- `npx prettier --check <changed files>` and `npx eslint <changed .ts/.tsx files>`.
- Changed and directly affected tests: `npx vitest run <test files>`.
- `node --import tsx scripts/dev-lab/typecheck.ts` and `npm run release:check -- --mode pr`
  (every PR adds docs/release/changes/<id>.md with front matter keys id, impact, section, title only).
- A failing test: run that one file on clean origin/main. Fails there the same way = known main red, not yours, note it in the PR.
- Load check: `node --import tsx -e "import('./src/main.tsx')"` must not throw on a missing import.

## Content rules (owner's standing orders; breaking one is a send-back)
- The owner's screenshots and examples name one place (e.g. Kentucky) only as an EXAMPLE. Every fix covers all 56 places (50 states, D.C., territories) through one code path, with a test that runs all 56. Never scope a fix to the place in the screenshot.
- NO hand-written player text. Never add or reword a sentence the player can read (screens, menus, news, journal, dialogue, tooltips).
  Screens show record data, approved control names (docs/ui/kit13/APPROVED-2026-10-04.md), and English-engine output only.
  REMOVING hand-written text is always allowed and wanted. Never replace removed text with new wording.
- Nothing hardcoded: no fixed names, numbers, places, events or "default" people. One rule for all 56 places and 50 states.
  Real data is the starting point and calibration only; estimates are labeled estimated with their source.
- American English only (council member, organize, county — never councillor, organise, local authority, ward unless the place's record uses it).
- No dice/coin-flip outcomes; outcomes come from recorded people, records and laws.
- English engine changes (composers, grammar, phrase use) are ENGLISH items: write the batch file, post READY, do not merge.
  Mined phrase banks from public records are data and may be merged.
- SCREEN items (anything that changes what a screen shows): take a full-screen screenshot of the screen from a NEW game in a
  random place on main and on your branch, put both in the PR body, post READY, do not merge.

## Machine rules (this runs on the owner's Mac)
- First thing in your working copy, shrink it (saves ~1 GB per session; history is already shared):
  `git sparse-checkout set --no-cone '/*' '!/art/references/' '!/art/generated/' '!/docs/codex/' '/docs/codex/assignments/' '!/docs/agent/'`
  If your item needs one of those folders, `git sparse-checkout add <folder>` for that item only.
- Never copy the repo. Use your one working copy; don't run `npm install` if node_modules exists — symlink it:
  `ln -s /Users/lamontae/Documents/PG-LAND/node_modules node_modules` (only if missing).
- Delete test-results/, playwright-report/ and any temp output you create when your item is done.
- Disk (CHANGED 10:30 a.m.): in a Codex cloud workspace (about 30 GB total), keep working; stop heavy runs only under 5 GB free and clean test-results/ first. On the owner's Mac (/Users/lamontae…) the floor is 40 GB free (`df -h /System/Volumes/Data`).
- Test runs over 10 minutes: run only the cases your change touches (`-t "<name>"`), say so in the PR.

## Rescue rules (old Codex PRs)
- (ADDED 10:30 a.m.) "Session NN", "S29", "Cloud H" and similar labels in old PR bodies or branch names belong to YESTERDAY's Codex sessions, which are all stopped. They own nothing. Every open PR in your range is yours except the exceptions named in your session file. Redo any triage that marked PRs OWNED-ELSEWHERE for that reason.
- For each PR in your range: if its work is already on main or superseded, CLOSE it with a one-line reason.
  If it adds hand-written player sentences, CLOSE it (do not rebase).
  Otherwise: check out its branch, merge origin/main, fix conflicts and failures, gate, merge (or READY if SCREEN/ENGLISH).
  Stacked PRs: retarget to main first. Never reopen a closed PR. Keep the original author's intent; no new features.

## PR body (short)
Before / After (what the player or world gets, plain words) · Files · Gate results (each command, pass/fail) · Known main reds hit.
