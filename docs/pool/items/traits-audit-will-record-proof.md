---
id: traits-audit-will-record-proof
title: "The trait audit names a will decision by an actual retained record"
area: people
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after: traits-decisions-never-run
lead: traits
model: sonnet
effort: medium
root: none
source: Merger 2 Done-when review of PR #5886
checked: fable 2026-11-10
---

**What.** The election-window audit counts estates.will calls but cannot name a retained decision record when the caller represents the wider population. The current gap says no work is needed even though the audit acceptance requires a record witness or tracked follow-up. Capture a real witness through the ordinary will and estate producers and report its source, without fabricating a will or changing inheritance behavior.

**Cause.** Found in code: data/content/trait-decision-gaps.json row estates.will (line 101) names this item as the missing witness; src/core2/estates.ts willOf (line 191) decides the will; the audit reports wider-population will calls with actorId null (Pagai, root 2351539a9f00bfa5, 2025-12-03 to 2026-12-03) and no retained record.

**Fix.** In audit tooling only, capture one real estates.will call from buildBenchWorld with its deciding person and the owning estate record, assert the record exists, and put the witness into the gap row. Add no production why-history.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Bookkeeping is a debug switch: keep additional trace collection inside audit tooling and do not add production why-history for every counted person. Wire to the world: the witness comes from buildBenchWorld and the existing estate producer, with the actual deciding person and owning record. Never weaken a test: preserve a fresh drawn-place case beside any pinned reproduction.

**Done when.** A second session runs the audit on buildBenchWorld for a played year in a drawn place and seed it chose, and sees an actual estates.will call with its deciding person and its retained decision or owning estate record id, a bounded check that fails if the cited record is absent, and the estates.will gap row naming the measured witness instead of saying no work is needed.

**Waits on.** Nothing.

**Files.** scripts/traits/trait-wiring-audit.ts, scripts/traits/trait-wiring-matrix.ts, data/content/trait-decision-gaps.json, src/core2/estates.ts

**Notes.** Merger 2 while reviewing #5886, October 25: Parkway body reports four wider-population will calls without a record; independent Pagai AS root2351539a9f00bfa5, window2025-12-03 to2026-12-03, reports one call with actorId null and no retained will or estate event. This is an explicit proof gap, not a claim that will behavior is absent.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have named a will decision by a retained record for the trait audit; no player sees it.
