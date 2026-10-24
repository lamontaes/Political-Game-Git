---
id: words-speech-reads-speaker-traits
title: "How a person talks reads the speaker's recorded traits for each choice the English engine makes"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Personality should shape how a person talks, and the English engine reads one trait today, for a line's register (src/director/ledger.ts:730). The trait-shaped outcome outcome.speech-style in data/content/trait-outcomes.json is graded read only in part, and its row says the Words line lists the trait reads speech needs. List those reads (for example how long, how warm and how direct a speaker's lines run), make the engine read the speaker's recorded traits for each when it picks a piece, and name the record each read came from.

**Rules.** No hand-written player text: the reads choose among graded bank pieces, never write words. No dice: the speaker's traits pick the piece, never a roll. Research before building: a size that is not the engine's own choice cites its study.

**Done when.** In one year of buildBenchWorld in a place drawn from all 56, seed named, two speakers with opposite recorded traits in the same scene get different pieces for the same line, named by scene record id and piece id, and data/content/trait-outcomes.json grades outcome.speech-style as read with that record and the engine line.

**Files.** src/director/ledger.ts, data/content/trait-outcomes.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread; owned by the Words line.
