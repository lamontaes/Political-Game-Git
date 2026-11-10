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
after:
standard: 2
model: opus
effort: medium
root: rc4-hand-written-words
lead: words
checked: fable 2026-11-10
---

**What.** Personality should shape how a person talks, and the English engine reads one trait today, for a line's register (src/director/ledger.ts:730). The trait-shaped outcome outcome.speech-style in data/content/trait-outcomes.json is graded read only in part, and its row says the Words line lists the trait reads speech needs. List those reads (for example how long, how warm and how direct a speaker's lines run), make the engine read the speaker's recorded traits for each when it picks a piece, and name the record each read came from.

**Cause.** Found in code: data/content/trait-outcomes.json (line 166) grades outcome.speech-style as wired "partly", citing src/director/ledger.ts line 730 as evidence, which on main is moment-summary code and not a trait read; src/english/speech-registers.ts reads no trait for a register. The row says the Words line lists the trait reads speech needs.

**Fix.** List the trait reads speech needs (length, warmth, directness), make the engine choose among graded pieces by the speaker's recorded traits for each, and name the record each read came from; correct the row's evidence.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the reads choose among graded bank pieces, never write words. No dice: the speaker's traits pick the piece, never a roll. Research before building: a size that is not the engine's own choice cites its study.

**Done when.** A second session, not the builder, plays one year of buildBenchWorld in a place drawn from all 56 (seed named) and sees two speakers with opposite recorded traits in the same scene get different pieces for the same line, named by scene record id and piece id, and data/content/trait-outcomes.json grading outcome.speech-style as read with that record and the engine line.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/english/speech-registers.ts, data/content/trait-outcomes.json

**Notes.** Split Oct 24 by the traits lead from traits-outcomes-unread; owned by the Words line.
