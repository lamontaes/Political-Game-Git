---
id: tests-card-born-where-draws-its-seed
title: "The born-where card test draws its seed at run time and is red at Bynum, Texas"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
source: "Civic roles builder, Nov 16, running src/bench/card-born-where.test.ts on Train a62a2fda"
model: sonnet
effort: medium
---

**What.** `src/bench/card-born-where.test.ts` draws its seed with `randomBytes` each run, so it passes or fails by the draw. At seed 2e683e672d9f819d, which draws Bynum, Texas (4811656), it fails on Train a62a2fda with `person_62865a651a4ae2bd ... expected 'jurisdiction_54a4370426f8df86' to be 'abroad'`. The resident's move came from abroad, but where they lived on the day they were born is a jurisdiction. Seen: in the test log, and on that resident's card.

**Cause.** Needs cause. The test's run-time seed is found in code. The abroad case is not traced yet. The first place to look is `residenceOn` in src/core2/past-moves.ts for a person whose birthplace is `abroad` and whose move-in came from abroad.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet.

**Rules.** One rule, all 56 places: the test names its places and seeds in the file and draws none at run time.

**Done when.** The test is pinned to named places and seeds (Bynum at 2e683e672d9f819d among them), the abroad case is traced and fixed, and the test names its places and seeds and passes at each one, Bynum included. A second session sees the card of a resident born abroad in a drawn place it names with its seed.

**Waits on.** Nothing.

**Files.** src/bench/card-born-where.test.ts, src/core2/past-moves.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16.
