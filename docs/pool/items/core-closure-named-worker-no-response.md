---
id: core-closure-named-worker-no-response
title: "An employer's closing names a worker who never reacts to losing the job"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: CTO, from the golden-path-year failure on PR 7909, Nov 9, 2026
claimed-at:
---

**What.** The golden path's accepted check M1-11 (`src/bench/m1-11-check.ts`) fails at some drawn places: an `organization.closed` event names a worker and that worker draws no response (no drive, no carry-on). Seen Nov 9, 2026 in Lomax, Illinois (key 1744381, seed f462350895bd9b028debbb210482c88439a8eb0f6be73f19a94807b103ecad9b): `employer-closed:2025-12-01:organization_f7e45bec3900dcfd` named `person_5a98b76199c74459` and nothing answered it. The same check passed that hour in Tuscarora, Nevada. Find why that worker is skipped (gone, moved, already jobless, an official, or not read by the drives reader) and fix the reader or the closing record, not the check.

**Rules.** An effect is a read, not a record (owner, Oct 13): every event that names a person is read by that person's own engines, so a closure naming a worker draws that worker's response. One rule, all 56 places: the fix holds for every drawn place, never one named place.

**Done when.** The M1-11 check (`src/bench/m1-11-check.ts`) passes at the drawn place Lomax, Illinois with the seed above, and a different session names the worker's record id and the response record it now draws in that played world.

**Files.** src/bench/m1-11-check.ts, src/core2/drives-economy.ts

**Notes.** Not caused by PR 7909 (it only adds facts to the eviction notice and a read-only departure lookup). Because the year-long path draws a random place, it fails only sometimes.
