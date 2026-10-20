---
id: release-red-private-share-reenroll
title: "Every played year stops on its first school day: private-school re-enrollment reads a parameter main removed (openingPrivateSchoolShare)"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5746
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Commit 0263e4d6b moved the private school share from one national parameter to each state's NCES enrollment and deleted openingPrivateSchoolShare from the parameter table. Commit 5519bbaeb, merged in the same main merge, added yearly re-enrollment in src/core2/private-tuition-reenroll.ts, which still reads that parameter. The school engine calls it on its day, so advanceCore throws Untagged numeric parameter: openingPrivateSchoolShare and no played world gets through a year.

**Rules.** Replace, never layer: re-enrollment reads the same per-state share the opening reads, one function, with no second copy of the national parameter brought back. One rule, all 56 places: the share comes from the state's data row, the median where a state has no row.

**Done when.** A one-year run of the played world in a drawn place (buildBenchWorld, seed named in the PR) passes the school engine's re-enrollment day, and src/core2/private-tuition-reenroll.test.ts and opening-private-tuition.test.ts pass reading the shared privateShareOf.

**Files.** src/core2/private-tuition-reenroll.ts, src/core2/opening-private-tuition.ts, src/core2/private-tuition-reenroll.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5746 (branch claude/private-share-reenroll): docs/release/changes/release-red-private-share-reenroll.md:5 says a played year stops on its first school day. src/core2/modules/school.ts:236 only calls re-enrollment when date.slice(5) equals tuition.reenrollOn, and src/core2/data/opening-private-tuition.json sets that to 08-01. Describe the annual August 1 re-enrollment crash rather than the first school day in the release note, body and pool title. The removed-parameter fix looks consistent with the code; light gates passed, but the unfinished typecheck/test gate was stopped for this claim correction and is not a test failure.; finish on that branch, merge main into it first.
