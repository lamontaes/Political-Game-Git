---
id: words-tenure-under-two-years
title: "A tenure under two years has no line, and five 'since {month year}' pieces no longer fit"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: low
root: rc4-hand-written-words
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Conversations now say a work tenure as whole years, and only from two years up (words/grading-bench-handler): nobody says the month they started. Someone at a job under two years has no tenure line, so that answer is not offered. The bank pieces worded with a {since} or {my_since} slot (own-work-answer-since, tenure-reply-reply-since, tenure-reply-answer-own, and the player's "I've been at {my_employer} since {my_since}.") no longer fit any fact. Give a short tenure its own wording and retire the date pieces.

**Cause.** Found in code: tenureYears in src/director/conversation.ts:365 returns a count only when the years are above one, so a tenure under two years has no text; data/english/parts/conversation.json still holds pieces with a {since} slot (for example "Since {since}." and "Ever since {since}.").

**Fix.** Add short-tenure bank pieces ("I just started.", "About a year now.") written by Story (every line in data/english/parts/ is Story's, owner's ruling of Nov 10; send the Words line the keys needed) and offered when the tenure is under two years, and retire the {since} and {my_since} pieces in the bank regeneration, not by hand-editing.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the short-tenure lines come from the bank by civic-prose, and the date pieces are retired in the bank regeneration, not hand-edited. One rule, all 56 places: tested in a drawn place, not a named one.

**Done when.** A second session (not the builder) runs a played-world test in a drawn place (place and seed named) and sees a player with under two years at a job answer how long they have worked there with a bank piece, and finds the bank holding no piece with a {since} or {my_since} slot.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, scripts/english-corpus/, src/director/conversation.ts

**Notes.** TODO
