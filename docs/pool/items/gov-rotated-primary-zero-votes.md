---
id: gov-rotated-primary-zero-votes
title: "Rotated primary gives a candidate zero votes in a generated Nebraska race"
area: gov
kind: bug
priority: 3
size: S
status: done
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

**Worked Oct 17 (claude/rotated-primary-zero-votes).** The engine is right and the test's premise was wrong. In Morrill, Nebraska (seed 28356001ecadf69b9750e2a94c3b10389733ad72b9e1380a68082a6198f2ea11) the two filed candidates for contest:seat:US-NE:us-senate:1:2026-11-03 are person_0203c9a9af22dc78 (public standing +0.02, recognition 0.0129) and the other candidate (standing −0.10, recognition 0.0043). A rotated ballot is worth 0.08 of appeal to whoever is listed first; their standing differs by 0.12, so the better-regarded candidate wins every counted vote on both forms and the other ends with none. The test's title says "nothing else separates" the candidates, but it never checked it. It now reads each candidate's standing, local standing, scandal, recognition and incumbency (`countedField`, exported from voting.ts) and holds the positive case only where their difference is less than a ballot position's worth, trying the next contest or place otherwise. Passes on the recorded seed and two others.
