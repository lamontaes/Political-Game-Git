---
id: tests-candidacy-sample-comment
title: "Describe the measured adult samples without claiming a 1200-adult minimum"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The comment introduced by PR 5999 says its adult sample is about 1200 at the smallest. The same fixture in Santa Ana contains 903 adults. Correct the factual explanation while preserving the all-adult sample and both assertions.

**Rules.** Claims must match evidence: minimumPeople counts people, while the sample filters adults, so the comment must name measured adult counts without claiming a universal lower bound.

**Done when.** The candidacy test comment names the measured Suissevale and Santa Ana adult samples and no longer claims a minimum adult count. A source comparison verifies that the test implementation and both share bounds are unchanged, and changed-file formatting passes.

**Files.** src/core2/candidacy.test.ts

**Notes.** Merger 3, October 26: factual wording follow-up to merged #5999; diagnostic logs retained under /workspace/scratch/merger3-oct26-5999.
