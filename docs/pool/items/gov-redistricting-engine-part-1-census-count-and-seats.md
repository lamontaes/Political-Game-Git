---
id: gov-redistricting-engine-part-1-census-count-and-seats
title: "The game recounts its people each tenth year and shifts House seats"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: rc9-place-facts-one-default
source: split from gov-redistricting-engine in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Every tenth year the game counts its own people and apportions the U.S. House seats among the states from the count. This replaces the fixed seat counts a state holds today with a count the game keeps, and it comes from the stubs gov-redistricting-census-count and gov-redistricting-census-seats-read. Seen: the number of U.S. House seats each state holds after a census, on the federal Government screen.

**Cause.** Design: docs/codex/specs/bank/b16-redistricting-vra.md (the only written spec; its old-core references are not ported, so take only what the golden path uses) and the owner's approved decisions D-6 and Sept 28 #8 named in gov-redistricting-engine. Today no src/core2 file draws a district, and SG-GOV-REACH-A-redistricting is open in src/core2/data/stopgaps/gov.json.

**Fix.** Add a census step that recounts the people of each state from the world's records (counted groups and full people by the same rule), apportions House seats by the equal-proportions method, and has the offices engine read the new seat counts.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list it). No dice. One rule, all 56 places: who draws and the rules come from the state's law in data, with no named state in code. No race or language field on any person: neighborhood makeup comes from Census place data and is used as courts use it under the Voting Rights Act. An effect is a read, not a record.

**Done when.** A second session, in a controlled census step in a drawn state (named with its seed), finds the state's people recounted and its House seats shifted from the count, by record id, and the offices screen showing the new seat count.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps/gov.json, src/districts/catalog.ts, src/core2/modules/offices.ts
