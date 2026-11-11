---
id: gov-m3-05-mayor-appoints-someone-they-know
title: "As mayor the player appoints someone they know to a town post, and the appointment keeps the tie as a reason"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-gov-m3-05-mayor-appoints-someone-they-know
pr: #8394
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: governing lead Oct 29
after:
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:30:32.572Z
branch: claude/pool-gov-m3-05-mayor-appoints-someone-they-know
---

**What.** M3-05's test sentence says the mayor appoints someone they know. The appointments engine already weighs whether a candidate is known to the appointer (`known`, a relationship pair, in `townPostInput`, src/core2/modules/executive.ts), and src/core2/executive.test.ts has the player name a resident to a post, but it picks the first resident by id, not anyone the player knows, and checks no tie. Nothing proves that the player's route as mayor lets them name a person from their own circle and that the record says so. Prove it from the player's office in the played world. Guards: the mayor's appointment choice, where the player names someone they know to a post and it takes, which the M3-05 golden-path check keeps working.

**Cause.** Found in code: src/core2/modules/executive.ts function townPostInput (line 410) weighs whether a candidate is known to the appointer, and src/core2/executive.test.ts has the player name the first resident by id and checks no relationship.

**Fix.** Write a test seating the player as mayor in a drawn place, naming a person from the player's circle to a vacant post through the office acts, and finding the appointment's reason citing the relationship record by id.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Ask why: the appointment's recorded reasons name the tie between the player and the appointee by relationship record id. One model, two tiers: a counted adult the player has met is filled in before they are named, and matches the records already kept for them. No dice: confirmation, where the form needs it, follows the members' own reads.

**Done when.** A second session, in a drawn place built with buildBenchWorld and the seed it prints, seats the player as mayor or the appointing council member, names a person from the player's circle to a vacant town post through the office acts, and finds the appointment row with that person as holder, a reason citing the relationship record by id, and the confirmation vote where the form has one; the M3-05 command names the test file.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/core2/executive.test.ts, src/core2/office-day-acts.ts, src/bench/office.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-05 command (branch governing/m3-spec-commands). Related, not a twin: gov-appointments-weigh-counted-adults widens the pool the character draws from.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:30 UTC) on branch claude/pool-gov-m3-05-mayor-appoints-someone-they-know.
