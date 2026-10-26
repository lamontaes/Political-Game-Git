---
name: play-first
description: >
  Works one item of Our Civic Duty's play-first lane, the one lane that makes
  the game playable for the owner: take the next item in
  docs/play-first/ORDER.md, build it inside its time box to its You-will-see
  line, push constantly, and leave a handoff line so the next agent of any
  model continues. Use when started with the play-first prompt or given a
  play-stop-* or play-first-* item; not for other pool items (session-start)
  or merging (merger).
---

# Play first

Current as of 2026-10-25, 18:30 UTC (the acting CTO's lane PR #5963; the owner's Oct 24 "go ahead": lane agents may edit director and English files for lane items, with the Words session's review)

The owner has never been able to play his game. This lane fixes that, one bounded item at a time, run by many agents of different models in turn. **The owner is a file, not a session:** his rulings are `docs/play-first/LAW.md`, the order is `ORDER.md`, where the last agent stopped is `PROGRESS.md`. Nothing lives in your memory or anyone else's.

## The one acceptance

The owner, on the installed Mac build, from **New game → Start a life** in a drawn town, reaches election night, votes in his own race, is told on screen whether he won, and never hits a locked screen. Every screen is free of developer text, every conversation has real choices, and the person on screen is the one he made.

## Start

1. Read `AGENTS.md`, then `docs/play-first/README.md`, `LAW.md`, `ORDER.md` and `PROGRESS.md`, then the CTO section of the channel `docs/coordination/LEADS-2026-10-24.md` (`.agents/rules/how-we-talk.md`: sessions never message each other; three files on main carry everything).
2. Take the first line of `ORDER.md` that `PROGRESS.md` does not show as done or as pushed in the last 3 hours, and whose item's `after:` items are done. Never work a blocked parent; work its `-a` or `-b`.
3. Claim it: `node --import tsx scripts/pool/index.ts claim <id> --branch play-first/<id>`. Taking over an older handoff: claim with that branch, check it out, `git merge origin/main`.
4. Read the item file: What, Rules (the `LAW.md` sections it serves), Done when, Time box, You will see, Screenshot, Files, Notes.
5. Take the **before** screenshot first: the bench (`npm run bench`, `/play`) at 1440×900, a place drawn from all 56, place and seed written down.

## Work

- Build to the **You will see** line, nothing wider. The **Time box** is a hard stop.
- **Push every 30 minutes or every green step,** whichever comes first, with a plain `git push`. Work not on GitHub does not exist.
- **Open a draft PR at the first push.** Line 1: `Pool item: <id>`. Then the gate line, then the before screenshot (the after replaces its placeholder when it exists), then the rest of `.github/PULL_REQUEST_TEMPLATE.md`.
- You change the files your item names; the lane is the only writer in `src/bench` until the owner lifts it. You may edit `src/director`, `src/english` and `data/english` directly for your item (owner, Oct 24): write `Review: words` in the PR body; the Words session reviews, and a merger never sends a lane PR back for touching them. A `src/core2` change is a pool item for that area's lead (`lead: <role>`): add it, write `needs-from: <lead> <item id>` in your handoff line, and build the screen side against what the engine gives today.
- A screenshot is the acceptance for every play item (the old `browser-visual-acceptance` skill, folded in here Oct 24): a full-window, lossless 1440×900 capture a human can judge; green tests never stand in for it; sharp assets are never blurred to match a backdrop; when a source image is too small, say so and give the size needed.
- `LAW.md` is not negotiable. If the item's text disagrees with it, follow `LAW.md` and say so in the PR body and the handoff line.
- Never use dev mode to get past something. A stop you can't get past is a defect: file it.
- No subagents unless your prompt says so.
- Never rebase, never force-push, never amend a pushed commit, never merge your own PR.

## Done

- **Done when** is a screenshot of the installed build, or of the bench at 1440×900, from a drawn place, with the place and seed under it. A test alone is not done.
- **The browser check.** `npm run bench` runs `src/bench/server.ts` on port 3000 (`BENCH_PORT` overrides it); play is at `/play`, dev mode beside it. Start with the Place field empty so the place is drawn, and write down the place and seed the title shows. Run the check for your screen, `node src/bench/<screen>.browser.mjs` with `BENCH_BROWSER` pointing at Chromium (there are checks for calendar, campaign, character, jobs, money, news, options, party, people, person-card, politics, sheets and travel; `no-scroll` covers every sheet; add one for a new screen in the same pattern). Then look yourself: click and keyboard-activate every control you changed; check fit (main screens don't scroll), people and props touching or overlapping, sharpness, leftover overlays, and hit areas matching what's drawn. Name every visible problem; green automation never overrides a visible failure.
- Run the changed-file checks (`local-gate`): typecheck, eslint and prettier on changed files, the tests for changed files, `npm run zero-dice`, `npm run release:check -- --mode pr`, `npm run pool -- --check`. Write the gate line.
- Fill the **Done when** table, the before and after screenshots with place and seed, and **Removed**. Add a release declaration in `docs/release/changes/`.
- Mark the PR ready and set the item: `node --import tsx scripts/pool/index.ts status <id> in-pr --pr N`. Mergers take lane PRs first (`docs/coordination/MERGE-FIRST.md`, line 1) and send back a lane PR without before and after screenshots; they never send one back for director or English edits (`Review: words`) or for data/english lines flipped to shippable.
- **Your screenshots close the PR; the owner's check closes the item** (owner, Oct 25: "remove that block"). The merger merges on your before/after screenshots and its checks; the owner's installed-build check sets the item done afterward. Never write "OWNER SCREENSHOT NEEDED"; it is not a merge gate.

## Stop (every time, for any reason)

Before you stop (done, time box spent, usage out, blocked, the environment restarting), add one line at the top of the log in `docs/play-first/PROGRESS.md`, in the shape `HANDOFF-TEMPLATE.md` gives, **on main only, never on your branch** (acting CTO, Oct 25): `git checkout main && git pull`, append, commit `play-first: handoff <item>`, push, then check your branch out again. If main refuses you, comment the line on your PR and the CTO copies it. A branch that changes `PROGRESS.md` is a defect; the merger drops the hunk:

```
- <UTC YYYY-MM-DD HH:MM> · <agent/model> · <item id> · <branch> · <last push sha> · <state> · <next step> · <blocking>
```

State is one of `started`, `pushed`, `PR opened #N`, `ready for recheck #N`, `blocked`, `done #N`. If the time box ran out, push what exists, keep the draft PR, and make the next step exact (a file and line, or a command). If the item turned out bigger than its box, split it: add `<id>-a` and `<id>-b` items (`-b` with `after:` `-a`), each four hours or less, and say so in the line.

## Cloud environments

Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"` on every npm command; never ask the owner to confirm it. On the owner's Mac: no clone, no `git worktree add`, no `npm ci`.

## The prompt

> Read AGENTS.md, then docs/play-first/README.md, LAW.md, ORDER.md and PROGRESS.md in lamontaes/Political-Game-Git. You are the next agent on the play-first lane; the lane is the owner, you are its hands. Take the first item in ORDER.md marked [open], or [claimed]/[in PR] with no push in the last 3 hours (check the branch); claim it: `node --import tsx scripts/pool/index.ts claim <id> --branch play-first/<id>` (or check out the existing branch). Work it to its You-will-see line inside its time box. Push every 30 minutes or every green step; open the draft PR at the first push with the item id on line 1 and before/after screenshots. Before you stop for any reason, append the handoff block from HANDOFF-TEMPLATE.md to PROGRESS.md on main (never on your branch) and push. Honor every line of LAW.md. Never dev mode to get past something; never force-push; never merge your own PR. Cloud environment: OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command; never ask the owner to confirm it.
