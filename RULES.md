# Codex day rules (Oct 7 2026) — every session reads this first

Repo: lamontaes/Political-Game-Git. Board (report here): GitHub issue #2424. CTO: Claude Opus (posts as "OPUS CTO").
Goal today: MERGE, MERGE, MERGE (20+ merges an hour). Sessions 01–30 build; Sessions 31–32 validate and merge. Finish work, get it onto main, take the next item. Never sit idle.

## Your loop (repeat until stopped)
1. Read your assignment: `git fetch origin assignments && git show origin/assignments:sessions/session-NN.md` (NN = your number, two digits).
2. Do the top item that is not marked DONE. One item = one branch = one PR, based on current `origin/main`.
3. Gate it (below). If it passes, mark the PR ready (`gh pr ready <N>`); the two merger sessions (31, 32) merge it. Builders never merge.
4. Post one line on #2424: `SESSION NN READY #N: <what the player or the world gets, plain words>`, adding `(SCREEN) shot: <link>` or
   `(ENGLISH) batch: <path>` for items the CTO or the owner must check. Fix any `SEND BACK #N` in place on the same branch, then post READY again.
5. Re-read your assignment file (it changes during the day). If every item is DONE, take the oldest unclaimed row
   in docs/codex/assignments/POOL.md: post `SESSION NN CLAIM <row>` on #2424 first, then work it.
6. If blocked more than 20 minutes: post `SESSION NN BLOCKED <item>: <exact question>` and move to your next item.

## Gate (changed files only; no full-suite run, no waiting on GitHub checks)
- `git merge origin/main` into your branch first (no conflicts left).
- `npx prettier --check <changed files>` and `npx eslint <changed .ts/.tsx files>`.
- Changed and directly affected tests: `npx vitest run <test files>`.
- `node --import tsx scripts/dev-lab/typecheck.ts` and `npm run release:check -- --mode pr`
  (every PR adds docs/release/changes/<id>.md with front matter keys id, impact, section, title only).
- A failing test: run that one file on clean origin/main. Fails there the same way = known main red, not yours, note it in the PR.
- Load check: `node --import tsx -e "import('./src/main.tsx')"` must not throw on a missing import.

## Content rules (owner's standing orders; breaking one is a send-back)
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
- Before any heavy run check `df -h /System/Volumes/Data`. Under 40 GB free: stop heavy runs, post `SESSION NN DISK`.
- Test runs over 10 minutes: run only the cases your change touches (`-t "<name>"`), say so in the PR.

## Rescue rules (old Codex PRs)
- For each PR in your range: if its work is already on main or superseded, CLOSE it with a one-line reason.
  If it adds hand-written player sentences, CLOSE it (do not rebase).
  Otherwise: check out its branch, merge origin/main, fix conflicts and failures, gate, merge (or READY if SCREEN/ENGLISH).
  Stacked PRs: retarget to main first. Never reopen a closed PR. Keep the original author's intent; no new features.

## PR body (short)
Before / After (what the player or world gets, plain words) · Files · Gate results (each command, pass/fail) · Known main reds hit.
