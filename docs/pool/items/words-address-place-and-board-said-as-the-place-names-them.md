---
id: words-address-place-and-board-said-as-the-place-names-them
title: 'An address says its place and board as the place names them ("Green Township", "the Green Township Board")'
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: S8 (claude/words-address-place-and-board-said-as)
pr: 9125
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Words lead, Nov 14, 2026, round 6 read of the speeches (#9074), Paris, Michigan
checked:
---

**What.** In Paris, Michigan, a town head's address says "Charter Township of Green Township Board" and "I want Charter Township of Green to hear". The place should be said "Green Township" in a sentence and the board "the Green Township Board". Seen: a township address in a drawn Michigan place that says the place and its board by the names its record gives, each once in full and then short.

**Cause.** Found in code: the speech planner reads `local.realmName` and `local.bodyName` from the offices engine's form names (`src/core2/offices-local.ts`, `boardBodyName`), which carry the legal form ("Charter Township of Green") and the board's own legal title; the speech says them as written. The place said-as reader (`src/english/said-as.ts`) is not applied to them.

**Fix.** Say the place through the place said-as reader (its common name, "Green Township") and the body through `boardBodyName`'s short form after the greeting; keep T42's body-name writer as the one writer (do not add a second).

**Time box.** 2 hours, Sonnet.

**Rules.** One rule, all 56 places: the place and board names come from each place's record, and no place is named in logic. No hand-written player text: the words come from the English engine's banks and readers. Replace, never layer: the one body-name writer stays the only one.

**Done when.** In three drawn township places (one in Michigan), the town address says the place and the board by their short names after the greeting, and a test fails on "Charter Township of" in any address sentence. A second session plays one such address on main.

**Waits on.** T42's #9081 (`boardBodyName`) being on main.

**Files.** src/core2/government-proper-name.ts (`governmentSaidName`, the one rule), src/director/local-address.ts, src/director/local-address-place-names.test.ts. The board's own name is the offices engine's (`boardBodyName` in src/core2/offices-local.ts, fixed by the job-titles thread's `placeOfBody`).

**Notes.** Filed by the Speeches builder (D) from the Words lead's round 6 read of #9074.
