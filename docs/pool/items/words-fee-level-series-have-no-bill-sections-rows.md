---
id: words-fee-level-series-have-no-bill-sections-rows
title: "The four fee series on the bill catalog have no bill-sections rows, so the bill-sections test is red"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/cluster11-fee-rows
pr: #9504
blocked-on:
source: the Account lead's note (Nov 15): src/english/bill-sections.test.ts red on the Train since the fee-bills fold #9308
after:
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A state or local body can draft a fee bill for parks, sewer and trash, public hospitals or tuition, and the bill's section had no words to print, so the two checks of the bill-sections test failed and a fee bill's paper could not be composed from its record. Seen: on the bill paper's section line for a bill of any of the four fee series.

**Cause.** Found in code: the fee-bills fold (#9308, a64d788233) added `fee-level:parks-and-recreation`, `fee-level:sewerage-and-solid-waste`, `fee-level:hospitals` and `fee-level:education` to `src/core2/data/legislature/series-powers.json` and their bill names to `data/english/bill-names.json`, but `data/english/bill-sections.json` has no `amounts` row for any of them. `npx vitest run src/english/bill-sections.test.ts` passes 23 of 23 on the fold's parent 09fe9281 and fails two checks (lines 36 to 40 and 360 to 365) from the fold on; checked against every drafting series and every policy name, these four are the only ones missing.

**Fix.** Add the four `amounts` rows the Words lead wrote, keyed by the series, each with a subject, purpose and the four raise and lower clauses, where the value reads as a percent of the schedule now in the budget. No code changes; the story topic name and the bill composer already read the row.

**Time box.** 1 hour for one sonnet session.

**Rules.** No dice. Words come from the bank; the rows are the Words lead's wording, unchanged.

**Done when.** A second session drafts a fee bill of each of the four series in a played game at a place and seed it chose and sees its section printed in words ("shall be raised from 100 percent to 110 percent of the schedule now in the budget"), with the drawn place, seed and bill record ids written down.

**Waits on.** Nothing.

**Files.** data/english/bill-sections.json

**Notes.** Played at Holiday Lakes, Texas, seed aa11, a State Representative's bills of the four series; lines in /mnt/project-files/words-lead/cluster-11/fee-rows/lines.md.
