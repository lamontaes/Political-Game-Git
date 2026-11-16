---
id: words-death-how-has-no-answer-for-unworded-causes
title: 'A relative''s "How?" after a death says they know nothing when the cause has no words yet'
area: words
kind: feature
priority: 2
size: S
status: merged
standard: 2
claimed-by: S3
pr: 9384
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: Account lead S3, from #9336 review, Nov 14, 2026
checked: s3 2026-11-14
---

**What.** When a relative's death is told and the player asks "How?", the answer plays only when the record's cause has words (a car crash, an overdose) or the player was told of an illness. For every other cause (heart disease and the rest) the answer is "That's all I know, {you}.", which says they know nothing more about a death whose record names a cause. Seen: the talk at home after a relative's death, at Carlock IL (rulings3-g:1, a death with a recorded cause that has no words).

**Cause.** Found in code: `RELATIVE_NEWS.deathCauses` in data/english/relative-news-words.json maps only two health-engine causes to words; the health engine (src/core2/modules/health.ts, `causeOfDeath`) writes a cause on every death a full person has. "Nobody has told us how {kin} died." and "I don't know more than that." said the same and #9336 removed them; "That's all I know, {you}." (shared with prison news, excludesFacts cause and illness-known) has the same condition and is left for this item. A choice's offer cannot read a fact the telling did not use, so "How?" cannot be gated on the cause.

**Fix.** Map every cause the health engine can write to a family wording in relative-news-words.json (the Words lead writes the lines), so `cause` is set for all of them and "How?" always has an answer; then the unanswered case cannot occur. Counted residents' deaths carry no cause and are not told in this scene (no household member has a counted relative in eight drawn places).

**Time box.** 2 hours, Sonnet medium, after the Words lead writes the cause wordings.

**Rules.** No dice; plain American English; people say how it feels, never a figure; a question offered is answered from a record.

**Done when.** In three drawn places (fresh seed, each named) with a death whose cause is not a crash or an overdose, "How?" is answered from the record in words, by record id, never "That's all I know". A second session plays one of them on main.

**Waits on.** The Words lead's wordings for the health engine's causes of death.

**Files.** data/english/relative-news-words.json, src/director/conversation.ts

**Notes.** Filed on the #9336 branch (claude/words-s3-relative-news-three-answers).

Nov 15 (S3, #9384): built the wordings for firearm-suicide, firearm-homicide and a named illness the house knew of. Still unanswered: a death whose cause is "other" with an onset that has no named condition (the answer falls to "That's all I know."); see words-death-how-lines-wait-on-record-facts.
