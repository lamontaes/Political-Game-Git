---
id: core-every-life-simulated
title: "Every life is simulated: relatives and acquaintances who live elsewhere live their lives at low intensity, through the same engines, with dated records"
area: core
lead: lives
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: owner, Nov 1 ("EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF")
---

**What.** The people the player knows who live elsewhere (most of the relatives at the start, the "husks") are kept minimal until met, and nothing happens to them, so a talk with one has nothing on record and opens empty: 12 of the 14 people the player knew in Lordship, Connecticut (`words-talk-husk-acquaintances-empty`). The owner rules that every life is simulated, at low intensity for people outside the played town. This item gives each of them a life at a coarse cadence: work and job changes, moves, marriage and partners, births, illness, aging and death. Each comes from the engines that already run those things for the town's people, never a second life engine, and each event writes the dated record those engines write, so the director, the journal and the conversation bank read it as news.

**Rules.** One engine per mechanic: a husk's job change, move, birth or death goes through the jobs, housing, people and health engines that already exist, read at a coarse cadence (monthly or by the event's own cause), never a new life simulator. No dice: events follow causes (their place's labor market, their age, health and household), with real rates checking totals only. Speed: low intensity holds the bar, so a country's year with husks simulated runs within 20% of the same year without, measured by the speed lead's method, and nothing scans every husk every day. Two-level population: a husk keeps the fields its life needs, and a full fill-in still happens only when the player meets or clicks them.

**Done when.** In a drawn place named with its seed, a one-year played run (buildBenchWorld) shows at least half the player's relatives who live elsewhere with one or more dated life records written by the existing engines (record ids named). A talk with such a relative opens on that news in the household-talk test, which passes on three drawn places. `npm run speed:year` stays within 20% of its base on the same machine.

**Time box.** Two days, one Opus lead with at most two helpers.

**Files.** src/core2/modules/people.ts, src/core2/modules/life.ts, src/core2/modules/health.ts, src/core2/modules/jobs.ts, src/core2/modules/housing.ts, the opening's kin generator, src/director/household-talk.test.ts

**Notes.** Filed by the CTO, Nov 1 16:50, on the owner's ruling (OWNER-DECISIONS, Nov 1 16:50). `words-talk-husk-acquaintances-empty` reads what this writes; Words words the news. Read: OWNER-DECISIONS (Oct 14 Q7, Oct 15 family talk, Oct 30 04:10, Nov 1), DECISION-REGISTER line 964 (relationships, absence), the `core-od-fill-in-outside-kin` item (done, kin kept minimal until met); searched the pool for husk, outside kin, low intensity.
