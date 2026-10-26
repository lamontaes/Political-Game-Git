---
id: world-owner-choice-not-reached
title: "No owner closes a business by choice in a played year (four drawn places)"
area: world
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4488
blocked-on:
source: "found by world-business-owner-seam"
---

**What.** In a 365-day run of the played world (`buildBenchWorld`, two-level) in four drawn places (Helena West Side, Montana; Franklin, New Hampshire; Miller's Cove, Texas; Benwood, West Virginia; seeds ownerprobe1, 3, 4 and 5), the business module's `choices` table stayed empty, so no owner, full or counted, ever closed a business by choice. The chooser and its closure path are proven only by the fixtures in `closure-by-choice.test.ts` and `business.test.ts`. Find why no failing shop reaches the decision in a year (the trigger, and the reasons that never favor closing) and make the owner's decision fire from causes: a shop losing money for months.

**Rules.** No dice: the owner's traits, the shop's books and the law decide. Wire to the world: the owner's own money decides whether the shop closes. An effect is a read. One rule, all 56 places: nothing names a place.

**Done when.** In a one-year played world (`buildBenchWorld`) in a drawn place, the `choices` table holds at least one counted owner's decision and one full owner's, each citing its reasons and the owner's fund account by record id, and the closure moves a real dollar; the tests in business.test.ts and closure-by-choice.test.ts still pass.

**Files.** src/core2/modules/business.ts, src/core2/data/business/business.json

**Notes.** Found by world-business-owner-seam. Probe: build the bench world, advance 365 days, read `api.moduleState("business").table("choices")`. A fifth seed (ownerprobe2) crashed in buildPopulation with "No household of Port Clarence, Alaska holds a resident aged 17"; core-needs-core-91 lists that crash.
