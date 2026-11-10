---
id: gov-redistricting-engine
title: "Redistricting after each census, drawn by whoever the state's law says, read from the independent-redistricting law"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on: gov-redistricting-engine-part-1-census-count-and-seats,gov-redistricting-engine-part-2-neighborhood-cvap-language,gov-redistricting-engine-part-3-who-draws-and-plan,gov-redistricting-engine-part-4-plan-screen-and-challenge
after: gov-redistricting-who-draws
milestone:
standard: 2
model: opus
effort: high
lead: governing
root: rc9-place-facts-one-default
source: "split from laws-family-government-operations; stopgap SG-GOV-REACH-A-redistricting; owner D-6 (approved) and Sept 28 #8"
claimed-at: 2026-10-19T23:51:06.707Z
---

**What.** After a census the game recounts its people, seats shift between states, and the maps are redrawn: council wards, state legislative districts and U.S. House districts, by whoever the state's law names (legislature, independent commission, council). The independent-redistricting law decides who holds the pen. Neighborhood makeup comes from Census place data and is used the way courts use it under the Voting Rights Act; it is never a label on a person.

**Cause.** Design: docs/codex/specs/bank/b16-redistricting-vra.md (its old-core references are not ported; take only what the golden path uses). Today no src/core2 file draws a district, and SG-GOV-REACH-A-redistricting is open in src/core2/data/stopgaps/gov.json.

**Fix.** After the golden path, recount people after a census, shift seats between states, and redraw wards, legislative and House districts by whoever the state's law names, using Census place makeup as courts do under the Voting Rights Act, with no race or language field on any person. The work is split into four parts (named in Waits on); this item is done when all four are merged.

**Time box.** 2 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop. The build itself is in the four parts; this item's time is for checking them together.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play, so check `docs/roadmap/political-process-baseline.md` before building. No dice. One rule, all 56 places. No race or language field on any person. An effect is a read, not a record.

**Done when.** A second session, in the running game, plays a decade (or a controlled census step) in a drawn place (named with its seed) and finds a map redrawn by the law in force, cited by record id, on one screen, with the stopgap row SG-GOV-REACH-A-redistricting resolved in src/core2/data/stopgaps/gov.json.

**Waits on.** Its four parts: gov-redistricting-engine-part-1-census-count-and-seats, gov-redistricting-engine-part-2-neighborhood-cvap-language, gov-redistricting-engine-part-3-who-draws-and-plan, gov-redistricting-engine-part-4-plan-screen-and-challenge. Not before early access play (docs/roadmap/political-process-baseline.md does not list it).

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json, src/districts/catalog.ts

**Notes.** Spec: docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what the golden path uses). Today no engine in src/core2 draws a district.

Oct 20: Switched from blocked to the automatic after: gate on gov-redistricting-who-draws, so it opens by itself the moment those items are done.
