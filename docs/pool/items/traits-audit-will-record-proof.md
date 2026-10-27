---
id: traits-audit-will-record-proof
title: "The trait audit names a will decision by an actual retained record"
area: people
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: traits-decisions-never-run
source: Merger 2 Done-when review of PR #5886
---

**What.** The election-window audit counts estates.will calls but cannot name a retained decision record when the caller represents the wider population. The current gap says no work is needed even though the audit acceptance requires a record witness or tracked follow-up. Capture a real witness through the ordinary will and estate producers and report its source, without fabricating a will or changing inheritance behavior.

**Rules.** Bookkeeping is a debug switch: keep additional trace collection inside audit tooling and do not add production why-history for every counted person. Wire to the world: the witness comes from buildBenchWorld and the existing estate producer, with the actual deciding person and owning record. Never weaken a test: preserve a fresh drawn-place case beside any pinned reproduction.

**Done when.** In a played year of buildBenchWorld with every module in a drawn place and seed the builder did not choose, the audit names an actual estates.will call and its retained decision or owning estate record id, verifies that record exists and carries the relevant outcome, and gives the person, place and seed in the PR body. A test or bounded audit check fails if the cited record is absent. The existing gap row then names the measured witness instead of claiming that no work is needed. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/traits/trait-wiring-audit.ts, scripts/traits/trait-wiring-matrix.ts, data/content/trait-decision-gaps.json, src/core2/estates.ts

**Notes.** Merger 2 while reviewing #5886, October 25: Parkway body reports four wider-population will calls without a record; independent Pagai AS root2351539a9f00bfa5, window2025-12-03 to2026-12-03, reports one call with actorId null and no retained will or estate event. This is an explicit proof gap, not a claim that will behavior is absent.
