---
id: words-one-line-spots-1
title: "Variants for the first 30 one-line spots, ranked by how often players hear them"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by:
pr: 0
blocked-on:
lead: words
source: docs/words/one-line-spots.md (#8182), rows 1 to 30
---

**What.** The most-played spots that held a single line (the job-offer decline farewell was heard 107 times in three drawn places) now hold two to five. Each of 61 new pieces sits in the same spot as the line it varies (same subject, step, move, role, purpose, key and after), says the same fact in other words, and carries a bearing so the speaker's traits pick the tone. The existing lines stay.

**Rules.** Declared slots only; no name tag on most lines; "okay", never "all right" or "alright", in the new lines; every fact is one the spot already has; American English.

**Done when.** `npm run words:grade` shows no pull and nothing waiting from the new lines and no silent spot; english-parts-banks and the English guards pass; a rerun of scripts/words/one-line-spots.ts lists none of rows 1 to 30 as a one-line spot; the new scene-talk replies that follow a line are judged as pairs by a session that did not write them.

**Time box.** 3 hours for one Sonnet session.

**Files.** data/english/parts/scene-talk.json, data/english/parts/scene-words.json
