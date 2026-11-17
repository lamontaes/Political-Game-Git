---
name: done-proof
description: >
  How done is proven in Our Civic Duty (CTO, Nov 16, on the crew's thread
  #9747, from the owner's rule "fix the cause, don't loosen the check"): what
  a pull request may never add without a CTO line, the screenshot from the
  running game beside its mock or the owner's words, the feature map, three
  strikes, no flaky-test skips, repeats that become checks, and the
  verification stamp in every PR body. Use before opening a pull request or
  marking one ready, and whenever loosening a red check looks easier than
  fixing it. Not for the second session's check after merge (seen-in-game) or
  the gate's commands (train-gate, checker).
---

# How done is proven

The CTO's rules of Nov 16, posted on the crew's thread (issue #9747). They come from the Claude Code team's verification practice and the owner's standing rule, "fix the cause, don't loosen the check". They apply to every lane. Go through them before you open a pull request or mark one ready.

## 1. Never edit the checks that judge you

A pull request adds none of these unless a CTO line on the crew's thread approves that exact pull request:

- `it.fails`, `.skip`, `.only` or `todo`;
- a raised baseline or budget, or a widened tolerance;
- a test pinned to a named town or seed (a test draws its place: `drawn-place-tests`; an approved pin is written as `pinned-tests` says).

Ask for the line before you build on it: the pull request, the check, and why the fix cannot be at the cause. A guard will enforce this; it reads its rules from main, never from the pull request.

## 2. Done means seen in the running game

A screen or feature counts as done only when the pull request shows a screenshot from the game itself, reached by playing (dev mode allowed), next to its mock or the owner's words. A passing test alone is not done.

- Take the screenshot from a build of your own head, not from a mock page or a composed scene.
- Put the mock or the owner's quote beside it, and say how you reached the screen: the clicks, or the dev mode control.
- This is the builder's proof. After the merge, a second session still checks the item on main before it is `done` (`seen-in-game`).

## 3. The feature map

The Screens lane starts `docs/feature-map.md` (new). It has one row per screen and one per owner ruling about what the player sees. Each row gives how to reach it, what must show, and the check that proves it. Every pull request that touches a row runs that row's check and names it in the stamp. Until the map is on main, the stamp says so.

## 4. Three strikes

If a check still fails after three real attempts at the cause, stop. Post "for the CTO" on the crew's thread with the check, the place and seed, and what each attempt tried and found. A rerun is not an attempt. Never loosen the check to get past it.

## 5. No flaky tests

A flaky test is never skipped, slept or retried. Find the cause: replay the failed seed first (`drawn-place-tests`, "Before you call a red a flake"). Or delete the test and write down why in the pull request body.

## 6. Repeats become checks

Every complaint the owner has made twice gets a check that fails when the problem comes back. The ones named on Nov 16:

- boxes;
- empty space;
- scroll bars;
- the same title painting every game;
- a person shown before gender;
- the strip wider than its people;
- a stranger named with no context.

Each check ships in the pull request of its fix and fails on the old code: undo the fix once and watch it go red (`session-start`, step 2).

## 7. Fast checks and heavy checks

The Long game lane splits the checks first, and builds the rule-1 guard in the same pull request:

- A fast set runs on every push: build, typecheck, guards, and the tests for changed files.
- A heavy set runs on a schedule and before the CTO merges: the full suite and the 20-year drawn-place run.
- The full run must finish. Today it is canceled at 45 minutes.

Until that lands, run the gate your role's skill names (`train-gate`, `checker`).

## 8. Stamp it

Every pull request body says how it was verified. "none" is allowed, but it must be written.

```
Verified: <command>: <result>, where it ran, at <head sha>; ...
Feature map rows: <rows run> | none
Screenshot: <image>, beside <mock or the owner's words> | none (<why>)
CTO line: <link to the approving line> | none
```
