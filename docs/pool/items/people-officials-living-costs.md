---
id: people-officials-living-costs
title: "Named officeholders have household living costs and cash of their own"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "found by gov-treasury-diversion"
---

**What.** Governors, mayors and other named officeholders in the played world are seated as identities with no household costs and almost no cash (`fillInIdentity`), so their pay piles up, their need never moves a choice, and the corruption engine's need term cannot strain them. Give each seated official a household drawn the way the opening draws any household of their age and pay: rent or mortgage, everyday living costs and kin, so their money and costs are real.

**Rules.** One model, two tiers: an official's household is built by the same rule as any household of that age and pay. No dice: the household is drawn from the place's population shares. Wire to the world: the costs move money on the journal. One rule, all 56 places. Estimate, never UNKNOWN: an unknown rent starts from the place's average marked ESTIMATED. Replace, never layer: the lone-person household stand-in for officials is deleted.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, every seated official has a household with a dwelling, living costs and kin by record id, their cash does not grow without bound over the year, and `treasury-diversion.test.ts` or the corruption test shows an official with real costs weighing a diversion or a bribe from their own need.

**Files.** src/core2/state.ts (`fillInIdentity`), src/core2/modules/officials.ts, src/core2/modules/offices.ts

**Notes.** Found by gov-treasury-diversion. Related to gov-stopgap-press-staff-missing-record, which has the same defect for reporters; one builder may serve both.
