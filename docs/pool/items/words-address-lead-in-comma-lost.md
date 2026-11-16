---
id: words-address-lead-in-comma-lost
title: 'An address drops the comma after "Because I hold that ...," and runs the belief into the stand'
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Desk, Nov 16, pressed walks for words-addresses-are-scenes-with-ties
---

**What.** An ask said with a "Because I ... {belief}," lead-in loses its comma, so the belief runs into the stand. The bank piece ends with the comma; the said sentence does not.
Seen: Cearfoss, Maryland, seed fb60d04e-cc86-440c-ba77-48f26b745c01, pressed walk at the address step-3 head, the President saying "Because I hold that some rules ought to be the same no matter where you live I urge Congress to reject statehood for the nation's capital."

**Cause.** Needs cause. The opener piece opening-speech.ask.polished-inaugural-because-i-hold-that-belief-belief-leads keeps "Because I hold that {belief}," in data/english/parts/opening-speech.json, so the comma is lost where an opener is joined to its core or where a belief fact ending is trimmed; the same loss shows on the Train head before this item's branch.

**Fix.** None until the cause is found.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** No hand-written player text in code: the fix keeps the bank's own punctuation and adds no sentence.

**Done when.** In a drawn place with a seed nobody chose, a pressed address with a "Because I ..." lead-in reads with its comma, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** data/english/parts/opening-speech.json, src/english/english-composition.ts, src/director/opening-story.ts
