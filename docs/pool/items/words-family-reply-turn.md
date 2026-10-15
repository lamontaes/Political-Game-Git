---
id: words-family-reply-turn
title: "A reply about a relative asks about theirs"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "found by words-replies-continue (owner, Oct 15 evening, batch 11 grading)"
---

**What.** Answering "How's Keanu?" with "He's doing fine." or "Thank you for asking." answers but does not carry the talk on. Add a family reply that turns the question back (asks after a relative of theirs the two share and the record names), through `follows`, a family raise role and authored pieces.

**Rules.** No hand-written player text (pieces are authored to the calibrated patterns); a reply moves the talk somewhere; no dice.

**Done when.** In a drawn place, the replies to a how-is question include one that asks after their relative, named by record id, and the other person answers it from their own record; the conversation test proves it.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json

**Notes.** The `family` subject has an ask role but no raise role, so `target("family")` finds nothing today.
