---
id: release-spelling-sweep-red-oct17
title: "american-english tests fail on main: British forms in docs, tests, a workflow comment and two English data names"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/spelling-sweep-green-s5
pr: #4957
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-22T05:20:03.057Z
---

**What.** The two American English tests failed on main on October 17. They found 14 British forms in docs, tests and a workflow comment, the British word "authority" in two English data names ("local authority"), and a FEMA incident name, "Sulphur Fire", that the sweep flagged though it is a fetched source name. Pull request 4957 respells the forms, exempts the FEMA data file as fetched source, and removes a duplicate pool item whose own id was British.

**Rules.** American English everywhere: the sweep stays strict, and only fetched source data is exempt, with its file named. Persisted identifiers keep their spelling.

**Done when.** `npm run spelling` lists nothing and `tests/american-english-sweep.test.ts` and the second English test pass on clean main (test output in the pull request), with the two bill names reading "broader local government power" and "more local government power".

**Files.** tests/american-english-sweep.test.ts, data/english/bill-sections.json, data/english/question-names.json

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.

Sent back 2026-10-20 from PR #4957 (branch claude/spelling-sweep-green-s5): The two Words-owned wording edits are removed, addressing that review. scripts/prose-eval/american-english-scope.ts:22-27 now exempts the entire live src/core2/data/disasters/declarations.json file to clear the Sulphur Fire spelling hit. That compiled simulation input is not a captured raw-source byte file; a whole-file guard bypass can hide future authored wording too. Preserve the official FEMA proper name and handle the sourced incident-title exception narrowly, rather than bypassing every field in the shipped disaster catalog, then rerun the changed-file checks.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #4957 (branch claude/spelling-sweep-green-s5): The narrow FEMA Sulphur allowance addresses the previous whole-catalog return. However, tests/american-english.test.ts now adds /^data\/research\/stopgaps-oct19\/census\/census-[^/]+\.json$/ to ALLOWED_FILES without a words restriction. Its stated reason is only the published proper names Grey Eagle, Sauk Centre, Fifth Ward and Centre Island, but the entry bypasses every checked word in every matching file, including future prose. This is another file-wide bypass added to clear a red guard, which the merger rule rejects. Keep the proper names with a narrow word/field exception and leave other text checked; do not replace the repaired FEMA blanket exemption with a Census blanket exemption.; finish on that branch, merge main into it first. <!-- british-spelling-ok: quotes the place names and words the sweep excepts -->

Sent back 2026-10-21 from PR #4957 (branch claude/spelling-sweep-green-s5): The new words restriction addresses the Census whole-file bypass return: only ward/wards, grey and centre are now excepted in that family. The body still has no Done when evidence table required by merger skill section 2.5. Map the actual item acceptance to both spelling guards and the spelling command on the merged head, and document the narrow FEMA/Census/index exceptions and any removed duplicate item. Keep all other words checked. No local gate pass is claimed here.; finish on that branch, merge main into it first. <!-- british-spelling-ok: quotes the place names and words the sweep excepts -->

Sent back 2026-10-22 from PR #4957 (branch claude/spelling-sweep-green-s5): Normal main integration conflicts in tests/american-english.test.ts:359; preserve narrow sourced-name allowances and strict remaining-word checks.; finish on that branch, merge main into it first.
