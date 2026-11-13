---
id: words-news-says-each-thing-once-like-a-paper
title: "News says each thing once and says it like a paper (Fable A's rule 15)"
area: words
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc2-done-from-records
source: "Fable A's rule 15, Nov 13, 2026 05:19Z on #8928, from Playtester P3 (6) and Playtester P2 (batch 2, 3)"
checked:
claimed-at: 2026-11-13
---

**What.** In Fruitland, Idaho (seed 6c66ce96-86ed-47d7-ad37-063de2ddc0bf, July 27, 2025), the Fruitland Press Briefs printed: "The friends of policing backs Clara Evans for Mayor. The friends of policing endorsed Clara Evans for Mayor." The headline and the body say the same thing, a plural name takes "backs", and the group's name loses its capitals ("The neighbors Concerned About rental rules"). Elsewhere in News:

- a failed bill "fell short by" its margin, not by the votes it lacked;
- a law is told by its parameter's catalog label;
- a station's empty page says "in print".

Seen: the News reader's stories and briefs.

**Cause.** Found in code: src/bench/printed-words.ts `endorsement` lowercases a group name whose last word is lowercase, which every founded group's name has, since its topic is inside it. It gives the bank no fact for the name's number. Its body lines are the headline's sentence again. src/bench/printed-words.ts counts "fell short by" as the margin. src/bench/words.ts says a law by its catalog label. src/bench/data/controls.json's empty-page text says "in print".

**Fix.**

- Cause-group forms carry their number in data/english/group-names.json, and `causeGroupForm` reads it.
- A founded group keeps its capitals and sets `plural-subject`.
- The endorsement brief's body says the vote's day (`when`, from the contest record), so it never repeats the headline.
- "Fell short by" is the votes missing from a majority (`short-by`).
- A law is told by whose it is and by `measureSaid`.
- An empty page says "Nothing here yet."

**Time box.** 3 hours for one session.

**Rules.** No hand-written player text: every sentence comes from the news and headline banks, with facts from the records the press kept.

**Done when.** A second session plays a year on main in a drawn place, named with its seed, and reads News and its briefs. An endorsement by a founded group keeps the group's capitals, takes the verb its number needs, and its body says the vote's day instead of the headline again. A failed bill falls short by the votes it lacked. No page says "in print".

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts, src/bench/words.ts, src/bench/archive-words.ts, src/bench/data/controls.json, src/english/group-names.ts, data/english/group-names.json, data/english/parts/news.json, data/english/parts/headlines.json
