---
name: merge-trains
description: >
  How Our Civic Duty's desks merge game pull requests in trains by area
  (owner, Nov 11: "start like bundling them up, like related stuff ... sorting
  them by pool area"): light checks per pull request, the heavy checks once on
  a train branch that holds one area's passed pull requests, halving a red
  train to find the one that broke it, and one comment that lists the train in
  merge order for whoever holds the merge step. Use when you are a gate desk
  or a merge desk and the CTO or the lead has called trains, and when you
  hold the merge step and a train is posted. Not for reds on main, rules,
  checks and skills, which merge one at a time at once (merger, checker), and
  not for pool notes (pool-notes).
---

# Merge trains

Owner, Nov 11, 2026: "maybe for the next few hours, you can stop merging and start like bundling them up, like related stuff, and then doing big bug fixes or stuff, or maybe sorting them by pool area ... and then maybe at 7 a.m. or something, you merge them all, or maybe you merge them at different points in the night ... just be a problem solver. Remember, the visible stuff first."

A train is one area's gated pull requests, checked together once and merged in a row. It saves the heavy checks: one typecheck and one played game for ten pull requests, not ten.

## What never rides a train

These merge one at a time, at once, by the usual gate (`checker`, `merger`):

- a fix for a red on main;
- a rule, a check or a skill;
- the hourly pool notes bundle (`pool-notes`).

## The areas, in order

Visible first (owner, Nov 11):

1. **Screens and UI:** anything under `src/bench/ui`, `src/bench/*.html`, `src/bench/*.css`, the browser checks, and every `play` item.
2. **Words and scenes:** `src/director`, `src/english`, `data/english`.
3. **Engines and the world:** `src/core2` and its data.
4. **Tests and tools:** `tests`, `scripts`, CI.

A pull request that crosses areas rides the train of the first area on this list that it touches.

## Between trains: the light gate, per pull request

For each open, ready pull request in your share, on its own head with main merged in, in your own tree:

1. `git fetch origin main pull/<N>/head`, check out the head, `git merge --no-edit origin/main`. A conflict in a generated file is merged by `generated-file-merges`; any other conflict is a send-back.
2. eslint and prettier on the changed files; `npm run release:check -- --mode pr`; `npm run pool -- --check`; `npm run zero-dice` when `src/core2` or `src/director` changed.
3. Read the body and the diff: line 1, evidence for each Done-when line, before and after pictures for a screen, `Review: words` when anything under `data/english/parts` changed, no unregistered placeholder.
4. Passed: comment on the pull request `<desk>: light gate passed on head <full sha>`. It is now a rider. Failed: send it back the usual way.

Do not run typecheck or the tests here. The train does.

## Building a train

About 40 minutes before a train's time:

1. **Pick the riders:** the area's pull requests with a light gate on their current head, oldest first. Where one pull request holds another (its body says so), the held one goes first. Stop at 12 riders; the rest take the next train.
2. **Make the branch in your own tree, and never push it:** `git checkout -B train origin/main`, then `git merge --no-edit <full sha>` for each rider in order. A rider that conflicts with an earlier rider leaves the train and is sent back with the other rider's number.
3. **Run the heavy checks once,** one at a time:
   - `NODE_OPTIONS=--max-old-space-size=8192 node --import tsx scripts/dev-lab/typecheck.ts`
   - the tests `npm run agent:test-cadence` names for the train's changed files, and the changed test files themselves
   - `npm run old-imports`
   - the golden path: `node --import tsx tests/golden-path/runner.mjs`
   - for a screens or words train, a new game in the bench on a place and seed nobody chose: the browser checks the riders changed, with `BENCH_BROWSER=/opt/pw-browsers/chromium`
4. **A failure that is also red on clean main does not stop a train.** Name it in the comment.

## A red train

Split the riders in halves, in order, and run the failing check on each half. Keep halving the red half until one rider is left. That rider goes back with the failing lines; the rest make the train again and the failing check runs once more on them. Two rounds of halving is the limit before the train's time: after that, post the half that is green and carry the rest to the next train.

## Posting a train

One comment on the crew's issue:

```
Train <area> <HH:MM UTC>: ready (main <full sha>)
#<N> <full sha>
#<N> <full sha>
Checks on the whole: typecheck, <n> test files, old-imports, golden path, <browser checks> in <place>, seed <seed>.
Red on main too: <test names, or none>.
Left behind: #<N> (<why in six words>).
```

The lines are in merge order. The sha is each pull request's own head as GitHub shows it.

## Merging a train

Whoever holds the merge step (on Nov 11: the CTO's account; a desk may merge only where the owner has allowed it in that desk's own account) merges the lines top to bottom, each with the head pinned (`--match-head-commit <sha>`, or `expectedHeadSha`). A pull request whose head moved since the train was posted is skipped and named; it never merges unpinned. After the last line, post `Train <area> <HH:MM>: merged <n> of <m>` with the ones skipped.

After a train lands, the desk that built it runs the golden path once on main. If it is red, say so on the crew's issue at once and name the train: finding which rider did it comes before the next train.

## Traps

- **A train branch is never pushed and never merged.** Each pull request merges by itself, so its item flips and its history stays its own.
- **Later riders are checked on top of earlier ones only in the posted order.** Merging out of order voids the check.
- **A rider that changed after its light gate** (a new head) leaves the train unless the light gate is run again on the new head first.
- **Do not hold a ready red-main fix for a train.** It merges alone.
