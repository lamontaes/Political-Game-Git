---
id: words-budget-amendment-bill-says-its-cause
title: "A budget amendment's bill paper and news story say why the line moved"
area: words
lead: words
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead builder, Nov 16 (found building laws-local-budget-amendments-need-a-recorded-cause)"
checked:
---

**What.** A line bill filed because receipts came in over or under what the treasury was bringing in says why, in the bill paper and in the town's news. Seen: the council's bill paper and the paper's budget story for a line bill name the cause in plain words, with no figure said by a person.

**Cause.** Found in code: src/core2/modules/world-legislating.ts `fileLines` now writes the cause on the bill's budget-line provision; the Account lead ruling 80 (Nov 15) says each amendment names its cause so the bill paper and the news can say why. The cause sits on the bill's budget-line provision as `cause` (receipts-over-plan or receipts-under-plan) from laws-local-budget-amendments-need-a-recorded-cause, and no line reads it yet.

**Fix.** Have the bill paper's section text and the press desk's budget story read the provision's cause and choose a banked wording by it; the Story session writes the lines, a builder writes none.

**Time box.** 3 hours for one Sonnet session after the Story session's lines.

**Rules.** Standing rule scene-standard: words come from the English engine's banks and people say how it feels, never the figure. Standing rule ask-why: the paper's reason is read from the bill's recorded cause by record id.

**Done when.** At a drawn place a line bill's paper and the news story name its cause, shown in a played file headed with the sha, and a second session sees both in the running game.

**Waits on.** The Story session's lines for the two causes.

**Files.** src/english/bill-sections.ts, src/core2/press-desk.ts

**Notes.** Filed Nov 16 on the branch of PR 9652.
