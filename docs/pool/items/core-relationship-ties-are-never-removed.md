---
id: core-relationship-ties-are-never-removed
title: "Relationship records are only ever added: 10,747 after one year, then 23,158, then 35,975 (Woods Cross, Utah)"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: memory
model: opus
effort: high
root: rc5-full-detail-every-day
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 7, "Relationships are never removed")
checked: fable 2026-11-10
---

**What.** The game keeps a record for every tie between two people and never lets one go. The code says so itself: "Ties are only ever added here, never removed" (`src/core2/state.ts`, line 1321). Measured in Woods Cross, Utah (seed f61d987b2e0e): the count of relationship records went from 10,747 after one year to 23,158 and then 35,975. A person who met someone once at a door keeps that tie for the life of the save, so memory, the save and every pass over a person's ties grow with history. The owner's rulings of November 5 and 8 say relationship records fold. Fix it for every person in every place: a tie that play no longer reads (nobody in focus, no contact inside the window its readers use, no family or household bond) folds into a short summary on each person, or is dropped where no reader needs even that, and the kept copy that the people engine reads is dropped with it. Seen: the game running a long save, where memory and a year's time stay flat because old ties fold.

**Cause.** Found in code: src/core2/state.ts line 1321 ("Ties are only ever added here, never removed", inside the `relationship` method, which indexes every tie into `relationshipsByPerson`); the comment warns that `tiedTo` in src/core2/modules/people.ts (line 145) reads a person's set of the same size as the same ties. Measured: Woods Cross, Utah (seed f61d987b2e0e), relationship records 10,747 after year 1, 23,158 after year 2, 35,975 after year 3.

**Fix.** Fold a tie nobody reads (no focus, no contact inside the window its readers use, no family or household bond) into a short per-person summary, or drop it where no reader needs it, together with the copy the people engine keeps (`tiedTo`); name each reader and its window by file and line; same rule for counted people.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: over one save, records kept in years 97 to 100 hold at most 1.2 times those of years 1 to 4, so old ties fold into summaries once play no longer reads them, and nothing scans every tie every day to do it. An effect is a read, not a record: a tie no engine reads again is a record with no effect, and the fold is decided by naming each reader and its window, by file and line. One model, two tiers: a tie to someone returned to the counts folds the same way as a tie between two full people. Owner, November 5, as recorded in OWNER-DECISIONS.md: "routine records nothing reads (folded causes, the durable log, relationships for people out of focus) fold down to results." Owner, November 8 morning: "relationship records and the durable log fold." CTO ruling of Oct 30, recorded Nov 1: "knowledge is compacted, never forgotten", so what a tie meant to the player's circle stays readable after the fold.

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. With dev mode's Run on the Calendar, play three years, 366 days at a time, and after each year read the count of relationship records from dev mode's Watch panel (the builder adds that line from the same records if none shows it): the third year's count is no more than 1.2 times the first year's. Open the player's own card and two people in their circle after year three: every family member, friend and person met in the last year is still listed, with how they know each other, and a talk with one of them still brings up what happened between them. Dev mode's records proof is identical for the first year in every table except relationships. Then the named repro, Woods Cross, Utah, seed f61d987b2e0e, three years: the counts no longer run 10,747, 23,158, 35,975. A test draws a place, plays two years and fails if a tie with no reader inside its window is still a full record.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/modules/people.ts, src/core2/calendar.ts, src/core2/closeness.ts, src/core2/circle-turnover-check.ts, scripts/speed-years/run.ts, src/bench/ui/dev-watch.mjs

**Notes.** From the Fable audit, Pillar 7. Measured there: the twin-world tax test in Woods Cross, Utah, three years each; the audit gives the three counts and does not say which records the growth is made of (strangers met at doors, campaign contacts, coworkers), nor which readers still need old ties. Confirmed on main, Nov 10 (helper): the comment is at line 1321, inside the `relationship` method, and a search of `src/core2` finds no code that deletes a row from `core.relationships` or `relationshipsByPerson`. The comment also warns that `tiedTo` in `modules/people.ts` trusts a set of the same size to be the same ties, so anything that removes a tie must drop that kept copy. Related: `core-long-run-tables-grow-with-history` (open, priority 1, size L: the roll-up of every table that grows; it lists core.relationships going 8,590 to 20,221 over six years in Ringgold, Louisiana, and each engine's fold is its own PR, so this is that PR's item), `people-circle-turnover-too-low` (claimed: a person's closest ties almost never change, the same absence seen from the circle), `core-long-run-circle-causes-fold` and `core-memory-circle-retention-leaks` (the circle's own records), `people-shared-time-grows-ties` (open: how a tie grows).
