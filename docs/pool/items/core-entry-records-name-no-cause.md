---
id: core-entry-records-name-no-cause
title: "A person or a firm entering the world leaves a record that gives its reason in words and names no record: dev mode's Trace cannot open why (about one traced record in ten)"
area: core
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-core-entry-records-name-no-cause
pr: #8503
after:
blocked-on:
lead: m0-m2
source: Fable, Nov 10, 2026, measured with dev mode's Trace in five drawn places (src/bench/dev-trace-every-id.test.ts)
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-11
claimed-at: 2026-11-11T06:14:34.858Z
merged-at: 2026-11-12T19:29:50.756Z
---

**What.** Everyone and everything that enters the world after day one leaves a record, person.recorded or organization.recorded, written by recordEntry in src/core2/state.ts (about line 2177). Its source line says 'Entered the world:' and a reason in words, and its facts hold the id of what entered and the same words. It names no record behind it: not the meeting or click that filled a counted person in, not the birth, the move, the hiring or the founding decision. Measured on Nov 10 with dev mode's Trace over every id the Journal and the News name after 45 days: in Merrionette Park, Illinois (seed b8f2b0de6397b36c), 122 of 819 traced ids were these records and each answered 'no cause kept'; across five drawn places 569 of 5,844 ids had no cause kept, most of them these. Seen: dev mode's Trace, where a person or a business on any record opens to the birth, move, hiring or founding that put them in the world.

**Cause.** Found in code: src/core2/state.ts `recordEntry` (line 2177), called at lines 2058, 2515, 2756 and 2800, writes person.recorded and organization.recorded with a reason in words and no record id behind it. Measured with src/bench/dev-trace-every-id.test.ts: 569 of 5,844 traced ids across five places had no cause kept (Merrionette Park, Illinois, seed b8f2b0de6397b36c: 122 of 819).

**Fix.** Add an optional `causeId` to the inputs of the four admitters that call `recordEntry` in src/core2/state.ts (lines 2058, 2515, 2756 and 2800) and store it as a fact on the entry record; src/bench/dev-trace.ts (about line 698) already opens any field that names a record. Then pass it from each producer, one at a time, each with its own test: a birth passes its `person-birth` record, a move its move record, a hiring its jobs record, a founding its `organization.founded` event, a seated official the seating record. A person filled in because the player opened or met them passes the meeting's record where there is one (the encounter's `sourceId`); a fill-in from a click has no record, because a read-only screen creates no facts, so its entry keeps the reason `filled-in` and no cause id. Keep src/bench/dev-trace-every-id.test.ts as the measure and state the count before and after.

**Time box.** 5 hours for one Sonnet session. When it runs out, push the producers that pass, list the ones left in the item's Notes, and stop.

**Rules.** Ask why: every proof answers why, by record, so a record the game prints must open to its cause. Keep it simple (owner, Oct 11): this adds one id to a record that is already written; it saves no new reasons for anyone. An effect is a read, not a record: the cause id is read by Trace and the journal.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs 45 days in dev mode, opens Trace on five people and three firms that entered the world after day one, and sees each show a cause that can be clicked (the act, birth, move, hiring or founding record), by record id. src/bench/dev-trace-every-id.test.ts in three drawn places, each named with its seed, counts no person.recorded or organization.recorded among its "no cause kept" answers.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/bench/dev-trace.ts, src/bench/dev-trace-every-id.test.ts

**Notes.** recordEntry has four callers in state.ts (about lines 2058, 2515, 2756 and 2800); each knows why the entry happened and can pass the record id. Finishing this lets play-dev-trace-answers-why-for-every-record-the-game-names meet its second Done-when line.

Released (2026-11-11): Measured in Merrionette-style 45-day run (place 1779007, seed scratch1): 52 person.recorded filled-in, 34 interest-group and 7 cause-group organization.recorded. Fill-in has no record for the meeting or click (personOrFillIn takes only a person id), and the groups come from several creators (interest-groups.ts x3, campaigns, drives) that must each pass a cause through addOrganization; needs a decision on which record names a fill-in's cause. Continue on branch claude/pool-core-entry-records-name-no-cause.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:57 UTC) on branch claude/pool-core-entry-records-name-no-cause.

**Notes (Nov 11, 2026, map folded in).** The first builder (#8503) confirmed the cause and mapped the work without building: each admitter is called by many producers and takes no cause today, so the id has to be passed down by each caller. Its open question, what record a fill-in cites, is answered in the Fix from the standing rule that a read-only screen creates no facts.
