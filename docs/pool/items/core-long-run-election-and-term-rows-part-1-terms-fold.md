---
id: core-long-run-election-and-term-rows-part-1-terms-fold
title: "Fold ended office terms into seat pasts and careers"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-core-long-run-election-and-term-rows-part-1-terms-fold
pr: #8354
after:
blocked-on:
lead: speed
source: split from core-long-run-election-and-term-rows in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: high
root: rc5-full-detail-every-day
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:58:53.118Z
branch: claude/pool-core-long-run-election-and-term-rows-part-1-terms-fold
---

**What.** Every election adds a term row per seat, and none is dropped, so a century-long save keeps decades of every legislature's terms. In Kirkman, Iowa offices.terms rises from 782 to 34,145 in four years. The agreed fold keeps the serving row and each seat's newest ended row and folds older ended terms at their seat's next seating into two new offices tables: seatPasts (one row per seat) and careers (one row per filled-in official), read through one resolver, termById, and one helper, careerOf.

**Cause.** Measured: `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (key 1941520) shows offices.terms 782 to 34,145. The reader map and the laws lead's changes are in the Notes of core-long-run-election-and-term-rows; the table is in src/core2/modules/offices.ts.

**Fix.** Never fold the town's seats, the president and vice president, any seat the player or the played person holds or held, or any resident's term. Fold other ended terms at the seat's next seating into seatPasts and careers as the Notes specify (careers keyed by person and office, service in integer days, each folded term's raw party kept). Add termById and careerOf and move the term-limit and card readers onto them.

**Time box.** 5 hours for an Opus session.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A second session runs `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (a drawn place) and sees offices.terms near 27,000 at year 4 instead of 34,145, with term limits, the person card and the press desk reading the same answers through termById and careerOf, and dev mode's records proof identical in every table except the folded ones. A test beside the offices module fails when a folded term stops resolving by id.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/modules/voting.ts, src/bench/legislature.ts

**Notes.** Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:58 UTC) on branch claude/pool-core-long-run-election-and-term-rows-part-1-terms-fold.
