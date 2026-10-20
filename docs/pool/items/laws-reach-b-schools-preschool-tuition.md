---
id: laws-reach-b-schools-preschool-tuition
title: "Universal preschool enrolls children and cuts child-care cost; the higher-education line sets tuition households pay"
area: laws
kind: stopgap
priority: 3
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-bb
pr:
blocked-on:
after: laws-reach-b-preschool-childcare,laws-reach-b-college-tuition
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:32:10.048Z
---

**What.** This is the roll-up for two law-reach stopgaps that need the schools side of the core: universal preschool (SG-GOV-REACH-B-preschool-enrollment, a records-only eligibility mark) and the higher-education line (SG-GOV-REACH-B-tuition, a support level that charges no one). They are built as laws-reach-b-preschool-childcare (pre-k enrollment and the household child-care cost) and laws-reach-b-college-tuition (college enrollment and tuition). When both are done, this item is closed by checking both chains once in the played world.

**Rules.** An effect is a read, not a record: household spending reads the enrollment and tuition records the law caused. One model, two tiers: counted households follow the same rule as full ones times their count. No dice: enrollment and cost follow age, income, the law in force and availability. The chain is the acceptance: each law is followed to a named household's changed payment. Replace, never layer: both records-only mechanics and their stopgap rows are removed.

**Done when.** After both parts are done, a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) shows a pre-k enrollment with a lower child-care payment and a college tuition changed by the support line, each by record id, with a balanced journal; src/core2/law-reach-group-b.test.ts passes and both stopgap rows are gone.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json, src/core2/law-reach-group-b.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the old blocker said a people schools engine with enroll() must exist first; it does not, so the two parts add only the enrollment each law needs. Overlaps in subject with laws-outcome-health-fiscal (which also names universal preschool); that item's PR should be checked so the preschool record is not built twice.
