---
id: dev-mode-remove-direct-law-write
title: "Remove the dev routes nothing in the game calls: set a law directly, the experiments and the saved experiments file"
area: play
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-dev-mode-remove-direct-law-write
---

**What.** With the /dev page deleted, dev mode's server still serves a direct set-a-law write (setLaw through enactLaw, no bill, vote or signature), the built-in and saved experiments and the saved-experiments file, and dev-mode.test.ts tests them. The Bills panel and Run until do the same through the game's own code, so these are leftovers. Delete the routes, the methods, the saved-experiments storage and the tests that only cover them, and keep any test that proves a law's effect by another route.

**Cause.** Found in code: `src/bench/dev-mode.ts` imports `./data/dev-experiments.json` (line 104), has `setLaw` (line 558) and the experiments `applySteps` (line 2204); `src/bench/dev-api.ts` serves them (route `GET experiments`, line 97, and a `setLaw` call at line 126). The Bills panel passes a law through a bill instead.

**Fix.** Delete `setLaw`, the experiments and saved-experiments routes and methods, `src/bench/data/dev-experiments.json` and the tests that cover only them. Keep tests that prove a law's effect by another route.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Replace, never layer: the direct write and the experiments are deleted in the change that removes their tests, and the PR counts what was removed.

**Done when.** A second session searches src and finds no `setLaw`, no experiment route and no dev-experiments file. In a drawn place (name and seed) it opens dev mode, passes a law through the Bills panel and sees it take effect through a bill, a vote and a signature. `src/bench/dev-mode.test.ts` and `dev-bills.test.ts` pass, and the PR body counts what was removed.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts, src/bench/dev-mode.test.ts

**Notes.** TODO

Released (2026-11-11): Claimed by hand, not built: setLaw is called by eight test files (dev-acceptance x2, dev-law-day-one, dev-mode, dev-outlook, dev-state-trace, law-reach-bargaining x3, law-wiring-rights-env x5, school-voucher-law x3) that use it to set a law before proving its effect; deleting it means moving each of them to the bill route (Bills panel / hold-the-vote) first, which the item does not scope. Split: first port those tests, then delete setLaw, the experiments routes and dev-experiments.json. Continue on branch claude/pool-dev-mode-remove-direct-law-write.

Released (2026-11-11): Five tests (dev-law-day-one, dev-outlook, dev-state-trace, dev-acceptance, dev-mode) prove federal and state law effects through setLaw, and a local bill cannot set a federal law on day one, so the item must first say what route those tests use instead; not built. Continue on branch claude/pool-dev-mode-remove-direct-law-write.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:05 UTC) on branch claude/pool-dev-mode-remove-direct-law-write.

Released (2026-11-11): Not built; inventory for the next builder. The experiments and saved-experiments parts are unreferenced by the UI (dev-api.ts lines 42, 62, 97-100, 495-514; dev-mode.ts line 106, 2242, 2247; src/bench/data/dev-experiments.json; scripts/law-wiring/check.ts line 891 cites it) and delete cleanly with dev-mode.test.ts lines 105-106. setLaw (dev-mode.ts 560, dev-api.ts 126) is NOT unused: it is called by dev-law-day-one.test.ts 33 (a law set before any session sits, which a bill cannot do on day one), dev-outlook.test.ts 65, dev-state-trace.test.ts 59, dev-acceptance.test.ts 129 and 346, dev-mode.test.ts 69, and dev-trace.ts 757 (via: dev-mode.setLaw). Each must be rewritten to pass its law through introduce, Hold the vote and sign, or kept as a test of its own route, before setLaw goes; the day-one test needs a decision on how a law reaches a world before the first session. Continue on branch claude/pool-dev-mode-remove-direct-law-write.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:06 UTC) on branch claude/pool-dev-mode-remove-direct-law-write.

Released by next (2026-11-13): no push to claude/pool-dev-mode-remove-direct-law-write since 2026-11-11 06:10 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-dev-mode-remove-direct-law-write.

Partly done (account lead carry of #8684, Nov 14): the experiments and saved-experiments routes, methods and `dev-experiments.json` are removed; `setLaw` and its eight test callers stay, so the item stays open for that part.
