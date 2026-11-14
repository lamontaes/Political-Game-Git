---
id: words-good-term-opens-on-the-measured-thing
title: 'A good-term address opens on the measured thing, not on "progress"'
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc4-hand-written-words
source: Words lead, Nov 14, 2026, round 6 read of the speeches (#9074)
checked:
---

**What.** "Progress on health care is something families feel in their own lives." says progress without saying what moved. A good-term address should open on the measured thing ("More families can see a doctor than seven years ago") whenever the record has it, as the Groton, Sweetwater, Sanborn and Coloma addresses already do. Seen: every good-term address of a drawn place opens on a sentence that says what improved and over how long, or on the best line the record can support.

**Cause.** Needs cause. The good-term draft (`goodDrafts` in `src/director/speech-outline.ts`) picks the measure nearest the subject and says it with the bank's `-better` story-says lines; the measured version ("More families can see a doctor than {context-years} years ago") needs `context-years`, which is absent where the term is shorter than `contextYearsMin`, so the vaguer lines play. Read which places hit that before fixing.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet.

**Rules.** No hand-written player text: the lines come from the English engine's bank. An effect is a read, not a record: the line reads the term's own measured change. One rule, all 56 places: tests draw their places.

**Done when.** In three drawn places, no good-term address plays a line that names no measured change; a test counts them. A second session reads one such address on main.

**Waits on.** Nothing.

**Files.** src/director/speech-outline.ts, data/english/parts/opening-speech.json, src/director/speech-outline.test.ts

**Notes.** Filed by the Speeches builder (D) from the Words lead's round 6 read of #9074.
