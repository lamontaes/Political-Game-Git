---
id: gov-redistricting-engine-part-4-plan-screen-and-challenge
title: "The plan shows on one screen and a challenge to it is decided by the law"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-redistricting-engine-part-3-who-draws-and-plan
blocked-on:
lead: governing
model: opus
effort: high
root: rc9-place-facts-one-default
source: split from gov-redistricting-engine in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The player and the press need to see a redistricting plan, and a challenge to a plan needs a decision. The plan shows on one screen read from the plan record, and a map challenge is decided by the law in force. It comes from the stubs gov-redistricting-plan-screen and gov-redistricting-map-challenge. Seen: the redistricting plan screen and the ruling on a challenge to a map.

**Cause.** Design: docs/codex/specs/bank/b16-redistricting-vra.md (the only written spec; its old-core references are not ported, so take only what the golden path uses) and the owner's approved decisions D-6 and Sept 28 #8 named in gov-redistricting-engine. Today no src/core2 file draws a district, and SG-GOV-REACH-A-redistricting is open in src/core2/data/stopgaps/gov.json.

**Fix.** Add a plan screen that reads the plan record through the shared screen controls, and a challenge act that a court or the law in force decides from the plan's record, writing the outcome as a record the next election reads.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list it). No dice. One rule, all 56 places: who draws and the rules come from the state's law in data, with no named state in code. No race or language field on any person: neighborhood makeup comes from Census place data and is used as courts use it under the Voting Rights Act. An effect is a read, not a record.

**Done when.** A second session, in a drawn state after a controlled census step (named with its seed), opens the plan on one screen read from the record, files a challenge and finds it decided by the law in force, by record id, with the next election using the decided map.

**Waits on.** gov-redistricting-engine-part-3-who-draws-and-plan.

**Files.** src/bench/government.ts, src/core2/data/laws/reach-group-a.json, src/districts/catalog.ts
