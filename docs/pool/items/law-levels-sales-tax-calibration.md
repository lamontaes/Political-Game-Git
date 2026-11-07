---
id: law-levels-sales-tax-calibration
title: "Keep the local sales-tax average as calibration, not an enacted law"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: astra/sales-tax-calibration
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T22:02:17.656Z
---

**What.** The generated local-sales-tax-average is a statistical fallback but is loaded into the active-law table and scheduled as a statute. Split calibration rows at the existing producer, keep them in the existing laws module as sourced estimates, and make the current tax and authority readers consume that classification.

**Rules.** No repeal-audit exclusion. Preserve every researched value, date and source; preserve existing sales-tax amounts and local authority results. Reuse the shared resolver and starting-date carry helper. No campaign, electorate or view changes. The actual local tax law supersedes a calibration fallback.

**Done when.** A generated-world regression drawn from all 56 proves no calibration row is stored as law or scheduled as a law taking effect, the sales-tax reader keeps the same sourced amount and state scope, and an authorized local rate replaces that estimate where local tax power exists. Test fails before the producer split, passes ten fresh draws and a new-game check. The strict repeal audit no longer fails on a statistical row left in the law table.

**Files.** scripts/research/build-starting-law.py,src/core2/data/laws/starting-law.json,src/core2/laws-starting.ts,src/core2/modules/laws.ts,src/core2/modules/legislature.ts,src/core2/sales-tax-calibration.test.ts

**Notes.** Astra bounded child of draft #7330. Two-hour time box, one session, no helpers. Existing law-wiring catalog already says this average is not a law. This corrects its producer/record classification, not the unrelated remaining unemployment-insurance route.
