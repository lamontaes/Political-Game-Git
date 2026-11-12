---
id: tests-early-returns-residents-retirees
title: "Four residents tests end early in a place without a retiree or a zero-day payday"
area: core
kind: cleanup
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-early-returns-residents-retirees
pr: #8540
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T03:48:33.776Z
after:
lead: laws-effects
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
merged-at: 2026-11-12T00:01:28.938Z
---

**What.** Generated-world tests can pass without checking their claim when their opening lacks a required record. PR #5037 replaces such early returns with bounded searches for an eligible opening or assertions proving the negative case, and its residents test conflicts with current main, so integrate the existing branch with a normal merge and preserve both sets of assertions. On main the bare early returns that remain are in src/core2/campaign-day.test.ts and src/core2/leadership.test.ts; the returns in src/core2/residents.test.ts follow an assertion or a success. Finish this repair on the existing branch rather than starting a duplicate.

**Cause.** Found in code: src/core2/campaign-day.test.ts line 597 (`if (!filing) return;` in the interview case) and src/core2/leadership.test.ts line 223 (`if (!chamber) return;`) end a test before any assertion, so it passes when the drawn place lacks the case. The returns at src/core2/residents.test.ts lines 207 and 712 come after an assertion or a success and are not skips; the release-change file the item once named is gone.

**Fix.** Replace each bare early return with a bounded draw across the 56 places that fails by name on exhaustion (or an assertion proving the negative case), naming place and seed. Build it fresh from main in the two test files named and keep every assertion. Do not merge the old branch claude/residents-test-draws (pull request #5037, sent back three times in October): it is far behind main and also edited a director test that Words owns.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: draw the fixture from actual place and resident records, name the place and seed, and never special-case a state to avoid a failure. No dice: eligibility comes from the records the test needs, not from whether the output already passes. Preserve all behavior assertions; protected Words files require a Words-owned change.

**Done when.** A second session runs the repaired tests in a played world drawn from all 56 places and sees each exercise its positive case or prove the absence from actual records, with the place and seed printed. A bounded search fails explicitly on exhaustion, the residents conflict is resolved without dropping assertions, and no bare return remains before an assertion in the changed files.

**Waits on.** Nothing.

**Files.** src/core2/residents.test.ts, src/core2/campaign-day.test.ts, src/core2/leadership.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5037 (branch claude/residents-test-draws): Merge main 974dd83da259 into claude/residents-test-draws conflicts in: src/core2/residents.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5037 (branch claude/residents-test-draws): Merging current origin/main conflicts in src/core2/residents.test.ts, src/core2/news.test.ts, src/core2/law-reach-group-a.test.ts and src/core2/law-reach-group-b.test.ts. Resolve those test conflicts on this branch, preserving both main assertions and the bounded nonempty-case searches, then rerun every changed test file on the merged result. Do not restore the old bare returns or drop the main law/payment assertions while resolving them.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5037 (branch claude/residents-test-draws): The remaining diff edits Words-protected src/director/opening-story.test.ts without Words ownership; separate that edit and describe the five test files actually remaining while preserving the bounded positive-case searches.; finish on that branch, merge main into it first.
