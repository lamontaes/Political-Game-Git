---
id: gov-redistricting-engine-part-3-who-draws-and-plan
title: "The state's law names who draws, and a plan is built for a place"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-redistricting-engine-part-1-census-count-and-seats,gov-redistricting-engine-part-2-neighborhood-cvap-language
blocked-on:
lead: governing
model: opus
effort: high
root: rc9-place-facts-one-default
source: split from gov-redistricting-engine in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The independent-redistricting law decides who holds the pen: the legislature, an independent commission or the council. A plan is built for a drawn place by that drawer from the new count and the neighborhood data, with the choice among printed plans and its reasons kept. It comes from the stubs gov-redistricting-who-draws and gov-redistricting-plan-builder. Feeds: gov-redistricting-engine-part-4-plan-screen-and-challenge.

**Cause.** Design: docs/codex/specs/bank/b16-redistricting-vra.md (the only written spec; its old-core references are not ported, so take only what the golden path uses) and the owner's approved decisions D-6 and Sept 28 #8 named in gov-redistricting-engine. Today no src/core2 file draws a district, and SG-GOV-REACH-A-redistricting is open in src/core2/data/stopgaps/gov.json.

**Fix.** Read the drawer from the state's law in force, build candidate plans of districts of near-equal population from place and precinct population data, and have the drawer choose among them by its members' reads, writing the plan as a record.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list it). No dice. One rule, all 56 places: who draws and the rules come from the state's law in data, with no named state in code. No race or language field on any person: neighborhood makeup comes from Census place data and is used as courts use it under the Voting Rights Act. An effect is a read, not a record.

**Done when.** A second session, in a controlled census step in a drawn state (named with its seed), finds a plan built by the drawer the state's law names, cited by record id, with the districts' populations within the equal-population tolerance reported as a number.

**Waits on.** gov-redistricting-engine-part-1-census-count-and-seats and gov-redistricting-engine-part-2-neighborhood-cvap-language.

**Files.** src/districts/catalog.ts, src/districts/place-precinct-population.generated.json, src/core2/data/laws/reach-group-a.json
