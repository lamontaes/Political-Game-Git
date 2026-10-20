---
id: words-arrogance-anger-and-fear
title: "Arrogance, anger and fear:"
area: words
kind: feature
priority: 2
status: open
claimed-by:
pr: #5219
blocked-on:
milestone:
source: "docs/coordination/words.md line 50 (unchecked checklist line)"
claimed-at:
---

**What.** The English engine has plain and polite registers but no boasts, threats or alarms, so every angry, frightened or proud moment in a scene sounds the same. Mine boasts, threats and alarms from public-domain speech, in plain and rude versions, as bank parts with move tags, and have the director choose who says them from the speaker's traits and the situation. The player would notice a rival boasting after a win, a neighbor threatening over a bad law, and a worried person raising an alarm, each sounding like that person.

**Rules.** No hand-written player text: the words come from the English engine's banks in `data/english/parts/`, authored with `origin: authored`, author and date or mined from public-domain sources with the source recorded; nothing is typed into code or a screen; American English: spellings follow `tests/american-english-sweep.test.ts` (run `npm run spelling`); No dice: the director chooses who speaks in anger or fear from traits, relationship and the recorded situation, never a roll or a percentage; Sliding scales and causes: intensity slides with the size of the cause and the speaker's temperament, with no threshold that flips a register; Research before building: mined lines are public-domain with the source kept; real speech sets the register and never picks one speaker's words; Ask why: each line cites the situation and trait that chose it; An effect is a read, not a record: the composer reads the traits and the situation when it renders; One rule, all 56 places: no place or person named in the parts.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): scenes composed in the year include at least one boast, one threat and one alarm, each with the speaker's trait record and the situation record that chose it (named by id), passing `tests/english-parts-banks.test.ts` and graded in the next batch. The owner plays it: loses an election to a rival and hears the rival boast, plainly or rudely by who he is.

**Files.** scripts/english-corpus/shapes/, scripts/english-corpus/mine-shapes.py, data/english/parts/, src/director/conversation.ts, tests/english-parts-banks.test.ts

**Notes.** Checklist line from words.md; verify against main before starting.
