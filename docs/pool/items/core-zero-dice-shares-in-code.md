---
id: core-zero-dice-shares-in-code
title: "Seven shares written as numbers in src/core2 and src/bench code move into parameter tables"
area: core
kind: cleanup
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: core-old-engine-01-zero-dice-guard-repoint (PR 5832 adds six of the seven allowlist entries this item removes)
source: added with npm run pool -- add
---

**What.** Pointing the zero-dice guard at src/core2, src/bench and src/director in full found seven shares written as numbers in code. They are SAME_SEX_COUPLE_SHARE (town-households.ts), TOWN_PART_TIME_SHARE (town-workplaces.ts), COUNCIL_SIZE_SHARES and COUNCIL_TERM_SHARES (gov-rules/typical-council-size.ts), the 0.5 even split in electorate-places.ts and modules/campaigns.ts, and HIDDEN_SHARE (bench/scene.ts). Every number lives in a parameter table with its tag, so each moves to its module's parameters with a source and spread, or is shown to be a structural one-half that the guard should not read as a share.

**Rules.** Every number lives in a parameter table, tagged SOURCED, ESTIMATED or TUNABLE. Research before building: a sourced value comes from a fetched page with a quote. The allowlist only shrinks.

**Done when.** The seven fixed-share entries are gone from scripts/zero-dice-allowlist.json, each value read from a parameter row with its tag, npm run zero-dice passes, and the tests of the changed files pass.

**Files.** src/core2/town-households.ts, src/core2/town-workplaces.ts, src/core2/gov-rules/typical-council-size.ts, src/core2/electorate-places.ts, src/core2/modules/campaigns.ts, src/bench/scene.ts, scripts/zero-dice-allowlist.json

**Notes.** TODO
