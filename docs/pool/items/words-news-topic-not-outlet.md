---
id: words-news-topic-not-outlet
title: "News passed on in talk names what happened, not the outlet that printed it ('Did you hear about New Albany Times?')"
area: words
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: story/news-topic-not-outlet
pr: 8073
blocked-on:
lead: words
milestone: play-first
source: "batch 4 capture, Nov 9 (words-batch-4-reads-wrong, scenes 12 and 20)"
claimed-at: 2026-11-09T19:20:00.000Z
---

**What.** The conversation engine raised the newest change a speaker knew of as news, filling the topic slot with the institution's name. For a story the speaker had read, that institution is the outlet, so people asked "Did you hear about New Albany Times?" and "Did you hear about Wgdz?" at a letter and at a birth. A story read is already raised by its headline as the printed subject, so the news subject now skips the change rows marked as stories and keeps the place that closed.

**Rules.** No hand-written player text: the fix reads the change rows' own story flag in bring-it-up-rows.json, never a typed kind. Wire to the world: the subject comes from the speaker's knowledge records.

**Done when.** src/director/news-topic-not-outlet.test.ts, in a played world drawn from all 56 places, finds no news subject whose topic cites an outlet; it failed before the fix in Washington, District of Columbia (seed bb6e6468b10b0db6ce94f09766c6b8860d67dfaa) and passes after.

**Files.** src/director/conversation.ts, src/director/news-topic-not-outlet.test.ts

**Time box.** 1 hour.

**You will see.** People bring up a story by its headline, and "Did you hear about" names a place that closed.

**Screenshot.** A talk with a neighbor who read the paper.
