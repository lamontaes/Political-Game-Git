---
id: world-grievance-rows-fold
title: "Old grievance rows fold into a per-place summary and end when either person dies or leaves for good"
area: world
kind: stopgap
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: speed
model: sonnet
effort: medium
root: rc5-full-detail-every-day
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** Grievance rows (a dispute with a full person on a side) stay open until their cause is undone and are never folded, so the open rows the monthly rehire check reads grow over a long save, and a grievance never ends when the layoff's person dies or leaves. Seen: in a person's grievances list, which ends when either person dies or leaves.

**Cause.** Found in code: src/core2/modules/grievance.ts line 246 (stopgap SG-WORLD-grievance-no-fold): the monthly rehire loop at line 248 walks every row of `grievancesOpen`.

**Fix.** End a grievance when either person dies or leaves for good (recorded with its reason), and fold ended and old rows into a per-place summary of counts by kind and year once the readers' window has passed (the readers are the police-patrol-and-grievance items, world-police-patrol-and-grievance-causes-part-3-readers, which fix that window; use their figure, or one year past the cause if it has not landed). The monthly check then reads only open rows. Resolve the stopgap row.

**Time box.** 5 hours for one Sonnet session.

**Rules.** Speed: years 97 to 100 of a save run at most 1.2 times as long as years 1 to 4, and old records fold once play no longer reads them. Wire to the world: a fold keeps counts that a reader can still ask for.

**Done when.** A second session (not the builder) runs `npm run speed:year` and a twenty-year world (`buildBenchWorld`, place and seed named in the PR body), sees the open grievance rows stay bounded across the run with the folded counts kept in the place summary, and a grievance end when one of its people dies, by record id.

**Waits on.** world-police-patrol-and-grievance-causes-part-3-readers sets the readers' window (use one year past the cause if it has not landed).

**Files.** src/core2/modules/grievance.ts, src/core2/modules/grievance.test.ts, src/core2/data/stopgaps/world.json
