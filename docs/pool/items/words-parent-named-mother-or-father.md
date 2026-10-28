---
id: words-parent-named-mother-or-father
title: 'The journal and the person card call a parent mother or father, not "parent", where the record has a sex'
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: words/parent-kin-words
pr: #6401
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-27T20:45:16.972Z
---

**What.** In v0.34.0 the Journal opens "Our family came from Albion, Pennsylvania. I was raised by my parent Kendall. My father Brian lived somewhere else. My brother Leo was born after me." and Kendall's person card reads "parent · Age 47" in lowercase, while Leo is "brother" and Brian is "father". The kin word falls back to "parent" with no mother or father, so the journal reads as if it could not say who raised him. This item uses the recorded sex to give the kin word (mother, father, brother, sister, son, daughter) in the journal and on the person card, and keeps "parent" only where no sex is recorded.

**Rules.** Serves LAW.md §5, Journal and the past ("Journal lines carry their subject," OD:309; the player's own context is kept facts the journal renders from day one, OD:122) and LAW.md §7, Words that ship. No hand-written player text: the words come from the engine's kin parts. Ask why: the word cites the person's record.

**Done when.** In a drawn place on the first evening, for each household member whose record carries a sex, the Journal's opening and the person card use the matching kin word and a test in src/director over the journal's kin words and the card fails on "parent" where a sex is recorded; where none is recorded the test names the record id and the builder reports it as a finding; shown by a screenshot of the Journal and one card with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The Journal says "my mother" or "my father" and the card says Mother or Father, never just "parent".

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/journal.ts, src/bench/card.ts, src/director/data/journal-rows.json, data/english/parts/journal.json

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). No owner words on this line; the owner's journal quote is "My brother Leo was born after me. What the hell kind of entry is that?" (the line is words-journal-household-lines). Verify Kendall Roberts's recorded sex first; the bench's record view shows it. The related words-family-talk-kin-address (PR open) covers asking after a parent as Dad or Mom by the parent's recorded gender. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
