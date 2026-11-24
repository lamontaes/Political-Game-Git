---
id: words-person-card-third-person-sketch
title: "The person card says what someone is like in the third person, from their record"
lead: words
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/person-card-sketch
pr: #6470
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:14:19.118Z
---

**What.** The screens designer (channel, Oct 27, 21:55 and 23:55) needs lines for what a person is like on the nearly empty person card. The person-sketch bank speaks only in the second person ("You keep to yourself.") for Who you are. The card for anyone else needs the same sketch in the third person ("She keeps to herself."), with the pronouns from the person's record.

**Rules.** No hand-written player text: the lines are bank pieces in person-sketch, filled from the person's recorded pronouns. Replace, never layer: the card reuses the one sketch function, not a second trait-word path. Serves player-screen-text.

**Done when.** In a drawn place, the person card for someone the player knows shows up to three third-person sentences from that person's recorded temperament, with she, he or they from the record. A test over knownCard fails on a second-person sentence or a pronoun that contradicts the record, and a screenshot of one card names the place and seed.

**Files.** data/english/parts/person-sketch.json, src/bench/card.ts, src/bench/play.mjs

**Notes.** Filed by the words lead on Oct 28 from the screens designer's need. The "how you met" line in the same need is a separate item.
