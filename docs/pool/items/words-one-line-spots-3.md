---
id: words-one-line-spots-3
title: "Variants for the third 30 most-played one-line spots"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #8225
blocked-on:
lead: words
source: third rerun of scripts/words/one-line-spots.ts after words-one-line-spots-2 (Brewster, Massachusetts; Weekapaug, Rhode Island; Castle Hill, California)
merged-at:
claimed-at:
---

**What.** The thirty most-played spots that still held a single line after batch 2 (the letter-ask close "I'll write again soon, {first}. Take care of yourself." heard 43 times, then the letter-ask follow-up and the school last-day farewell replies) now hold two or three lines each. Each of 61 new pieces sits in the same spot as the line it varies (same subject, step, move, role, purpose, key and after), says the same fact in other words and carries a bearing where the original does. The existing lines stay.

**Rules.** No hand-written player text in code: every new line is a bank piece that sits in the spot it varies. Declared slots only; no name tag on most lines; "okay", never "all right" or "alright", in the new lines; every fact is one the spot already has; American English.

**Done when.** `npm run words:grade` shows no pull and nothing waiting from the new lines and no silent spot; english-parts-banks and the English guards pass; a rerun of scripts/words/one-line-spots.ts lists none of the thirty spots as a one-line spot; the new scene-talk replies that follow a line are judged as pairs by a session that did not write them. A second session reruns scripts/words/one-line-spots.ts in three drawn places it names with their seeds, and none of the thirty spots is listed.

**Time box.** 3 hours for one Sonnet session.

**Files.** data/english/parts/scene-talk.json, data/english/parts/scene-words.json

**Notes.** Not seen in the game (2026-11-11, second-session-2): Sedgwick CO, Hopkinton RI, Middlebury VT (drawn by one-line-spots.ts), seed ols-mwbhjuoq-0-txhb, -1-jban, -2-i4np, main 5103f744: rerun of one-line-spots.ts still lists 6 of rows 61 to 90 as one-line spots, among them 'Did you hear?' and 'Eight thirty at the corner by the school.'
