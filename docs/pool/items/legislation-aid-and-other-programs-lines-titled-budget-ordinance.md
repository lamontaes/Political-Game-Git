---
id: legislation-aid-and-other-programs-lines-titled-budget-ordinance
title: "A member's bill to change the aid or other-programs line still reads Budget Ordinance"
area: words
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: carry-spend-line-names
pr: #9347
after: legislation-budget-line-bills-all-titled-budget-ordinance
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: "The second words reader's note on #9333, Nov 14, 2026 (Klamath Falls, Roy and Delta City titles)"
checked:
claimed-at:
---

**What.** After the one-line budget names landed, two lines still print "Budget Ordinance" on a member's one-line bill: local aid ("Aid to other governments") and other programs. Seen at Delta City MS (2025-10), Roy MT (2025-5, 2025-10) and Klamath Falls OR (2025-7, 2025-13). Seen: the meeting agenda and the paper.

**Cause.** Found in code: data/english/bill-names.json holds `budget:<line>` rows for twelve lines only; `billNameOf` falls back to "Budget Ordinance" for a line with no row.

**Fix.** Add `budget:localAid` and `budget:otherPrograms` rows with the wording the Words lead ruled (/mnt/project-files/words-lead/budget-line-names-draft/ruling.md): "Aid to Other Governments Increase/Reduction" and "Other Programs Funding Increase/Reduction". The remaining lines the engine has without a row (interest and the federal lines) stay "Budget Ordinance" and are not member bills in a town.

**Time box.** 1 hour.

**Rules.** No hand-written player text in code: the names are authored bank rows. One rule, all 56 places.

**Done when.** A second session plays a drawn place (named in the PR body) until a member's bill changes the local aid or other-programs line and sees "Aid to Other Governments Reduction Ordinance" or "Other Programs Funding Increase Ordinance" on the meeting agenda, never "Budget Ordinance"; the full budget still reads "Budget Ordinance".

**Waits on.** Nothing.

**Files.** data/english/bill-names.json, src/english/bill-names.test.ts

**Notes.** None.
