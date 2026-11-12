---
id: words-cut-argument-reads
title: "A department head's argument against a budget cut names what the line pays for and leans on nothing unsaid"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8097
blocked-on:
lead: words
milestone: play-first
source: "owner graded the cut-argument scene and could not follow it: a narrator line named a {post} and said the head 'has the page', and a reply asked for a list no one mentioned"
claimed-at:
merged-at:
---

**What.** The narrator line about the cut now says what the budget line pays for ("fire protection", "highways"), from the budget line's own name on the record, in a new fact `line`; it no longer says "has the page". The reply "Send me the list. I'll answer tomorrow." now stands alone ("Put it in writing. I'll answer tomorrow."), and the thank-you "I'll get the list to you" no longer names a list no one raised. Piece keys are unchanged, so grades carry over.

**Rules.** No hand-written player text outside the banks: the line name is the budgets engine's own name for the line (line-names.json). Wire to the world: the fact cites the cause record and the budget.

**Done when.** src/director/budget-cut-scene.test.ts, in a drawn town, composes the department head's scene with a `line` fact equal to the budget screen's name for the cut line and citing the cut record, and no line in the scene says "has the page" or "send me the list"; director.test.ts, the families guard and the English guards pass.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, data/english/grade-map.json, src/director/budget-cut-scene.test.ts

**Time box.** 1 hour.

**You will see.** "The council cut fire protection by $62,000 in the budget it passed. Teresa Hall wants to talk about it."

**Screenshot.** The department head's scene after a budget cut, on two cut days in one drawn town, side by side.

**Notes.** Not seen in the game (2026-11-11, second-session-2): Ceredo, West Virginia (drawn), seed 03f336b4a1ea, main 32a6683b: budget-cut-scene.test.ts fails at line 261: the fire chief's scene text on one cut day is identical to the text on another day, so the argument does not vary
