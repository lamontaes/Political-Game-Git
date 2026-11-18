---
id: opening-campaigns-and-filings-empty-at-day-0
title: "Campaigns, endorsements and filings are empty at day 0 and fill within a year"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the day-zero check (skill day-one-in-motion), Nov 14, measured on train head 8bb1ff9d; the Account lead called these tables stock"
claimed-at:
after:
lead: money
model: sonnet
effort: medium
root: day-one-in-motion
---

**What.** At creation the world keeps no rows in `core2-campaigns-v1.races`, `core2-campaigns-v1.campaigns`, `core2-campaigns-v1.endorsements`, `core2-elections-v1.filings`, `core2-elections-v1.petitions`, `core2-elections-v1.petitionSignatures`; they fill within a year of play (owner, Nov 14: "The town must be in motion on day one... not just town, but country and state. Remember, it's all one simulation.") Module: core2-campaigns-v1 and core2-elections-v1; levels as listed in the Cause. A real place has the races on the ballot: who has raised money, who has been endorsed, who has filed or is collecting signatures. Filings, petitions and signatures are required only where a contest's filing window is open on the start date (the day-zero file marks them `when: filing-window-open`); campaigns, races and endorsements for races already under way are required everywhere. Seen: the first screens on day 0 read empty until the year passes.

**Cause.** Measured: `node --import tsx scripts/dev-tests/day-zero-year.ts a1 365` and `... b2 365` on train head 8bb1ff9d, Washington, District of Columbia (`drawPlace("a1", "day-zero")`) and Lewiston, Maine (`drawPlace("b2", "day-zero")`), two-level population, opening Jan 20, 2025. Rows at creation / after 1 / 31 / 365 days: `core2-campaigns-v1.races` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/11/11 at Washington, 0/0/23/23 at Lewiston; `core2-campaigns-v1.campaigns` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/72 at Washington, 0/0/0/58 at Lewiston; `core2-campaigns-v1.endorsements` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/182 at Washington, 0/0/0/174 at Lewiston; `core2-elections-v1.filings` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/72 at Washington, 0/0/0/58 at Lewiston; `core2-elections-v1.petitions` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/72 at Washington, 0/0/0/58 at Lewiston; `core2-elections-v1.petitionSignatures` (town, county, state and federal; creation / day 1 / day 31 / year 1) 0/0/0/3095 at Washington, 0/0/0/2777 at Lewiston. Not yet traced to the first writer; the first step is to read the function that first writes each table in src/core2/modules/campaigns.ts and see what the opening leaves undone.

**Fix.** Opening stock comes from the engine that makes the flow, run backward or run ahead (a warm-up of its own step, or a draw from its own steady state with the place's own figures), never a second generator and never a hand-filled list. Change the first writer of each table in the files below. The numbers come from the place's rows, never from a place named in code.

**Warm-up result (Nov 14, 31-day warm-up of src/core2/player-warm-up.ts, measured at Washington DC and Lewiston ME on train head b7ed6337).** The warm-up fills `core2-campaigns-v1.races` at both places; their known-red marks are gone. Still empty after it: `core2-campaigns-v1.campaigns`, `core2-campaigns-v1.endorsements`, `core2-elections-v1.filings`, `core2-elections-v1.petitionSignatures`, `core2-elections-v1.petitions`. This item now covers only those; the engine that owns each writes its stock for the past date inside the warm-up window.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): one engine per mechanic; no dice (seeded generation of who exists is allowed, nothing after day 0 is a draw); one rule, all 56 places; estimate, never UNKNOWN; replace, never layer; a year stays under two minutes (`speed:year` before and after, table in the PR body).

**Done when.** A second session, not the builder, builds a world at a drawn place and seed it names (`buildBenchWorld`, two-level) and sees the listed table(s) with rows at creation, by record id; the row for `core2-campaigns-v1.races`, `core2-campaigns-v1.campaigns`, `core2-campaigns-v1.endorsements`, `core2-elections-v1.filings`, `core2-elections-v1.petitions`, `core2-elections-v1.petitionSignatures` in `src/core2/data/opening/day-zero.json` has its `knownRed` mark removed, and `src/core2/day-zero.test.ts` passes at its two pinned places.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts; src/core2/modules/elections.ts; src/core2/data/opening/day-zero.json
