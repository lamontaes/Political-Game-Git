---
id: gov-recall-rule-pack-doctrine-statutes
title: "Three places' local recall rules disagree with the statutes read: South Dakota grounds, Wyoming scope, Mississippi scope"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The municipal rule pack (data/municipal-elections/92O-national-state-baseline.json, read by resolveMunicipalRecallRule in src/core2/gov-rules/municipal-ballot-rules.ts) disagrees with statute text read on October 23, 2026 for three places. South Dakota is read as needing no grounds, but SDCL 9-13-30 says the allowable grounds for removal are misconduct, malfeasance, nonfeasance, crimes in office and the rest, and the petition must state them. Wyoming is read as a universal statutory recall under Wyo. Stat. 15-1-1101, but the statute found is 15-4-110 for commission-form cities, and the 2026 bill HB0022 that would have given every municipal officer a recall failed in the Senate on March 3, 2026. Mississippi's citation, Miss. Code Ann. 25-5-1 et seq., covers elective county officials, while the pack applies it to the town's offices. Read each statute, correct the pack rows with citations, and keep data/research/core/recall-timing-statutes-2026.json in step.

**Rules.** One rule, all 56 places: the doctrine, grounds and scope are per-place rows in the pack, never a state named in logic. Research before building: each corrected row quotes the statute it came from, and a recall that cannot happen under that law never starts.

**Done when.** A test in src/core2/recalls.test.ts reads the corrected pack rows for the three places, and in a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR) a South Dakota or Wyoming town's recall rule prints its grounds and scope with the statute citation from the pack.

**Files.** data/municipal-elections/92O-national-state-baseline.json, src/core2/gov-rules/municipal-ballot-rules.ts, src/core2/recalls.test.ts, data/research/core/recall-timing-statutes-2026.json

**Notes.** TODO
