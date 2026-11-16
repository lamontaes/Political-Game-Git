---
id: tests-offices-unknown-district-place-no-upper-seat
title: "A place the Census district files do not know gets no state upper-house seat at one draw"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: Desk thread, Nov 15, golden-path M2-01 on #9489 (red on clean Train 29ef46856d0b2cd6d74595d587875a1787820115 too)
---

**What.** golden-path M2-01 (`npx vitest run src/core2/offices.test.ts`) fails its test "a place the Census district files do not know is covered by a U.S. House seat and a seat of each of its state's chambers, as an estimate" at the draw 3126156, seed 59468beffa602cd7737d0e2328ccbff4b18e710b749e3cb3523599a7611d7c2c: "no legislature-upper seat covers the town: expected 0 to be greater than 0".
Seen: on CI for #9489 at 172909381 (job 132981661238) and locally on the clean Train head with that seed.

**Cause.** Needs cause. Where to look: the test's estimate path in src/core2/modules/offices.ts for a town the Census district files lack, which should seat an upper-house district for it; this draw seats a lower-house one and no upper.

**Fix.** None until the cause is found.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the estimate seats every chamber of the state for any town the district files lack, from data, never a named place. No re-pin and no looser assertion.

**Done when.** The offices test passes with seed 59468beffa602cd7737d0e2328ccbff4b18e710b749e3cb3523599a7611d7c2c (place 3126156) and at a drawn place with a seed nobody chose, every chamber's seat covering the town by record id; a second session runs it on main.

**Waits on.** Nothing.

**Files.** src/core2/offices.test.ts, src/core2/modules/offices.ts
