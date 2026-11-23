---
id: gov-local-run-decision-skips-residency
title: "A person who does not live where a local seat serves decides to run for it, and the clerk then refuses the filing for residency"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: #9741
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 16 (M0-13 red on a pull request's golden-path run), lead's call
merged-at: 2026-11-16T20:13:11.101Z
---

**What.** For a local seat, the people who weigh running include drawn people who live outside the area the seat serves, and their residency is checked only at the clerk's window. One of them can decide to run and then be refused, so a race that had a willing challenger goes to the ballot without one. M0-13 fails on it at Benton City, Washington.
Seen: the player reads a decided race in a drawn place and finds a resident who chose to run but was never on the ballot.

**Cause.** Measured: at Benton City, Washington (5305560), seed 4593b6744ef16dc0158b7a58ad5fec33d1817620a41fc34ff301b2bd7d57b863, by `GOLDEN_PATH_SEED=<seed> GOLDEN_PATH_PLACE_KEY=5305560 node --max-old-space-size=8192 --expose-gc --import tsx --test tests/golden-path/played-world.node-test.ts` on the Train at 8298068547 and at 544056f5, the same each time: "a named challenger runs" fails. The one adult other than the incumbent who chose to run in the 12 decided races, person_4065b0459ed3b2a5, decided on 2025-01-21 for contest:seat:gus2025:183782:board:0:2025-11-04, and the filing was refused for residency, so there is no filing row. Found in code: src/core2/modules/candidacy.ts, the `weighs` test in the contest's field (near line 1050), admits anyone in `pool` and applies the residency check from `checkEligibility` only when `wide` (a state or federal contest, line 980). A local contest lets a non-resident weigh and decide, and `checkEligibility` in src/core2/modules/elections.ts refuses the filing at the residency rule.

**Fix.** Apply the same residency check in `weighs` for every contest, not only wide ones, so a person who could not file for a seat does not weigh running for it, read from the one `checkEligibility` rule the clerk uses. No new rule and no second check. Then replay Benton City and confirm the race's challenger, or the race's true lack of one, matches the filings.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** Ask why: a decision to run is weighed only by people the clerk's own residency rule lets file, so every run decision has a filing.

**Done when.** M0-13 passes at Benton City, Washington with the seed in the Cause. Then a second session replays M0-13 in a drawn place, Some Town, State (seed nobody chose), and finds every decision to run either filed or refused for a reason the person could not have known when deciding.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, tests/golden-path/played-world.node-test.ts

**Notes.**
