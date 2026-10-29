---
id: people-partnering-in-play
title: "Full people partner and separate in play, so a wedding, a first date and a breakup have a record to come from"
area: people
kind: feature
priority: 2
size: L
lead: m0-m2
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The core has setPartnersV1, which adds or ends a partner link and emits family.partnered or family.separated, but on main nothing calls it outside tests (grep setPartnersV1 in src: only src/core2/state.ts and src/core2/types.ts). No one in a played world starts dating, marries, separates or divorces. The director's celebration, date and breakup scenes wait on those records (situation-types.json rows marked awaitingProducer: married, started-dating, broke-up, separated). The births engine already reads family.partnered (#5395).

**Rules.** No dice: two people's ties, ages, pay, household and the law decide who pairs and who parts; real marriage and divorce rates (CDC per thousand) check totals and never pick a couple. One rule, all 56 places. One model, two tiers: counted adults by the same rule times their count.

**Done when.** In a one-year run of buildBenchWorld in a drawn place (place and seed named), at least one full couple forms through setPartnersV1 and one separates, each by record id, and the births engine and the director read those records (a family.partnered id on a births review and on a director moment).

**Files.** src/core2/state.ts, src/core2/modules/people.ts, src/director/data/situation-types.json

**Notes.** TODO

Oct 29 (Words): the director's `celebration` (married) and `breakup` (separated) causes wait on this. `setPartnersV1` in src/core2/state.ts emits `family.partnered` and `family.separated`, but no engine calls it in play: a played year in Glasgow, Delaware (seed rel-c) recorded 0 of each, and the only partnership records are the pre-start history's. Once an engine partners and separates people in play, the two causes are a read (skill `scene-producers`).
