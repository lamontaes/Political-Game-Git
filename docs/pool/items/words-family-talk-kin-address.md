---
id: words-family-talk-kin-address
title: "Relatives who share a parent can ask after them as Dad or Mom"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr: #6156
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The playtest (Oct 24) heard a sister ask 'How's John?' about their own father. play-stop-20 stops two relatives from asking after a relative they share, since the banks name a relative only by first name or as 'your father'. The owner expected 'a sister who calls our father Dad'. The banks have no kin address words (Dad, Mom, Grandma), so a brother and sister who live apart cannot ask after their parent at all.

**Rules.** No hand-written player text: words come from the English engine and its banks (words-engine). Owner, Oct 24 playtest: a sister calls our father Dad.

**Done when.** In a generated world from buildBenchWorld in a drawn place, two relatives who share a parent and live apart can ask after that parent from the existing bank as Dad or Mom according to recorded gender, never the parent's first name or a possessive 'your' or 'my'. A test names the seed, parent and both family source record ids, and checks that an asker living with that relative is excluded. The current owner scene-review ruling applies; this change adds no new bank sentences. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts, src/director/data/journal-rows.json

**Notes.** Split from play-stop-20 by the speed lead (Oct 25); the shared-relative skip is on that PR.

Merger 0: Sent back 2026-10-26 from PR #6156 (branch play-first/words-family-talk-kin-address): own merged-tree validation blocked by this merger workspace's invalid GH_TOKEN/HTTP401, preventing real-head fetch and main integration/push; no code defect claimed. Status/Notes updated through connected GitHub because the pool CLI cannot authenticate. Finish validation on that branch with working checkout credentials, merge main into it first.

Merger 0: Clarified the existing generated-world acceptance and retired the stale grading-batch clause under the owner's October 24 ruling in OWNER-DECISIONS.md: scene review replaces batch-style grading, and the hold is released. The existing bank lines are reused; the required parent-address behavior and record proof are retained.

Sent back 2026-10-26 from PR #6156 (branch play-first/words-family-talk-kin-address): typecheck fails, PersonId imported from core2/kernel/brands instead of core2/types in two tests; finish on that branch, merge main into it first.

Merger 0: Rechecked after authentication recovered, 2026-10-26, PR #6156 branch play-first/words-family-talk-kin-address, merged/pushed head 955b05a72d5969e6872afad05a3875468b9fa668. Sent back: full typecheck fails TS2305 on PersonId imports from kernel/brands in conversation-kin-address.test.ts:7 and conversation.test.ts:32 (use core2/types). The new runtime proof also fails after all six drawn worlds on GOLDEN_PATH_SEED f1350af46867adfa0152e4f9960c576d: Coral Bay VI, Niantic CT, Rafael Capó PR, Hendrix OK, Mayfield OH and Grandview OK have no observed shared-parent ask in a year. It reached assertion failure in 339 seconds, not timeout/cancellation. Existing conversation cases show 16 pass/5 fail, not yet attributed as new without a same-seed main baseline. Keep the branch's generated-world acceptance/current grading-rule documentation correction; fix the imports and make the real parent proof reliable without selecting a convenient seed or fabricating events. Current open CLI succeeds; this code/proof reason supersedes the old auth blocker. Finish on that branch, merge main into it first.
