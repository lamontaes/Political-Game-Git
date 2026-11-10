---
id: play-nov8-journal-says-he-moved-to-where-he-was-born
title: "The journal says a man moved to the place he was born in, because a parent lives elsewhere today (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point C30, not fixed)
---

**What.** The owner, Nov 8, about 2:20 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "I go to journal... None of my history is simulated. I can't see anything that my character went through." The CTO's note on the same screenshot (point C30): "The chapter 'Connecticut 1981' opens with 'More than a year on, I moved to Connecticut' though he was born there in 1981, and ends with 'I moved to Connecticut' again." What main does now, read in code on Nov 10, not measured: `originOf` in `src/core2/past-moves.ts` (line 37) decides where a person came from by looking first for a living parent whose home today is outside the county, and only then at the person's recorded birthplace. So a person born in the town whose mother has since moved away gets a `person.moved-in` record (line 141) from the mother's town to their own. The journal tells every such record as the person's own move to where they live now (`src/director/journal.ts`, lines 400 to 405 and 861 to 864, piece "I moved to {place}."), and titles the first chapter with that place (about line 1256). Fix the cause for every person in every place: where someone came from is read from their own birthplace and their own records of where they lived, never from where a parent lives now, and a person born where they live has no move told.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: a move in the journal must name the record that says the person lived somewhere else first, and a parent's address today is not that record. One model, two tiers: the same rule decides the past of a counted person filled in on a click, so the person the player opens matches what the records already say. OWNER-DECISIONS, Oct 28 (quoted in the playtest check, point C30): the past tells "where the family lived and moved". OWNER-DECISIONS, Oct 14, morning: "The journal is a dramatized story, not a list of facts."

**Done when.** A different session starts the bench (`npm run bench`) with dev mode on and starts a new game in a drawn place (place and seed named in the proof). For the player and for five adults opened from People, it reads the birthplace and any `person.moved-in` record in dev mode's person panel and takes a screenshot at 1440×900 of the Journal's first chapter (for the player) or the life section of the card (for the others). Nobody whose birthplace is the place they live in may be told as having moved there, and nobody's move may name a place their own records never put them in. A chapter title must name the town, not only the state. A test runs the past in six drawn places and fails on any move record whose from-place comes only from a parent's current home. The same check is then run in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The owner plays it: a character born in his town has a journal that starts with growing up there, not with moving in.

**Files.** src/core2/past-moves.ts, src/director/journal.ts, data/english/parts/journal.json

**Notes.** From the Nov 8 playtest, point C30 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check D): "past-moves.ts:37-55 counts anyone whose living parent lives outside the county today as having moved in, so a man born there 'moves in.' Every move is worded as a move to where he lives now... The first chapter is titled with that place, which comes out as 'Connecticut,' not Manchester"; root cause there: "Where he came from is read from a parent's home today, not his birthplace"; owner: Lives. Neither file has changed since that check (compared against the check's commit on Nov 10). The opener "More than a year on" in the same quote is fixed (the span words now reach years). This item sits in the past engine, not in a screen; the lead named on it is the one the audit's filing brief gave every Nov 8 leftover, and the lives lead should review it (`.agents/skills/lives/SKILL.md`). Related open: core-deep-past-school-place-from-birthplace (schooling follows the birthplace), core-deep-past-kin-past-on-fill-in. Related, filed Nov 10: play-journal-says-one-thing-three-times, play-nov8-journal-chapter-has-no-picture. The thin past itself (no partners, accidents or college before day one; points P32 and P36) is the audit's Pillar 4 life record and is not this item. Not verified: nothing here was measured in the running game on Nov 10.
