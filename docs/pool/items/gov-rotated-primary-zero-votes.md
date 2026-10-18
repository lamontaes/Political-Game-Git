---
id: gov-rotated-primary-zero-votes
title: "Rotated primary gives a candidate zero votes in a generated Nebraska race"
area: gov
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/rotated-primary-zero-votes
pr: #5029
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:21:08.416Z
---

**What.** The ballot-order test fails on clean main for Morrill, Nebraska (3132830), seed 28356001ecadf69b9750e2a94c3b10389733ad72b9e1380a68082a6198f2ea11. In contest:seat:US-NE:us-senate:1:2026-11-03 a candidate on the rotated primary ballot receives zero votes. Trace the counted electorate, filing eligibility and rotation premise to determine whether the engine or the test is wrong, retaining the required positive primary case.

**Rules.** Ask why: follow the candidate and electorate records to explain the zero total before changing any assertion. One rule, all 56 places applies to the engine and its generated-world regression.

**Done when.** The ballot-order test passes on the recorded failing seed and a fresh drawn place, with the actual rotation behavior explained by record ids and every existing voting assertion preserved or replaced by a demonstrated correct invariant.

**Files.** src/core2/ballot-order.test.ts, src/core2/modules/voting.ts

**Notes.** Merger reproduced the identical zero-vote assertion on PR #4933 and clean captured main on 2026-10-18. Evidence: merger-oct17/4933-ballot-main-same-seed.log.
