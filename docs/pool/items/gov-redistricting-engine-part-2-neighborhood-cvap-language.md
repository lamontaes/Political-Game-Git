---
id: gov-redistricting-engine-part-2-neighborhood-cvap-language
title: "Neighborhood makeup, voting-age citizens and language data"
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
effort: medium
root: rc9-place-facts-one-default
source: split from gov-redistricting-engine in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A redistricting plan needs the makeup of each neighborhood the way courts read it: Census place makeup, citizen voting-age population and language-minority data, kept as cited place data and never as a field on a person. It comes from the stubs gov-redistricting-neighborhood-data and gov-redistricting-cvap-and-language. Feeds: gov-redistricting-engine-part-3-who-draws-and-plan.

**Cause.** Design: docs/codex/specs/bank/b16-redistricting-vra.md (the only written spec; its old-core references are not ported, so take only what the golden path uses) and the owner's approved decisions D-6 and Sept 28 #8 named in gov-redistricting-engine. Today no src/core2 file draws a district, and SG-GOV-REACH-A-redistricting is open in src/core2/data/stopgaps/gov.json.

**Fix.** Research and add cited Census data files for place makeup, citizen voting-age population and language groups, keyed by place and district, with a reader in src/districts; add no race or language field to any person.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The Political Process baseline and golden path come first: this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list it). No dice. One rule, all 56 places: who draws and the rules come from the state's law in data, with no named state in code. No race or language field on any person: neighborhood makeup comes from Census place data and is used as courts use it under the Voting Rights Act. An effect is a read, not a record.

**Done when.** A second session finds, for a drawn place (named with its seed), cited place makeup, voting-age citizen and language figures readable from src/districts by place, each row with its source, and no race or language field on any person record.

**Waits on.** Nothing.

**Files.** src/districts/query.ts, src/districts/types.ts, src/districts/catalog.ts
