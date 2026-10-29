---
id: words-printed-interview-bribe-vacancy-unworded
title: "Printed interviews, bribe exposures and Senate vacancies reach News with no words"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: words
milestone: play-first
source: added with npm run pool -- add
---

**What.** The printed-stories test (src/bench/printed-words.test.ts) fails on clean main in Yankton, South Dakota (4673060, GOLDEN_PATH_SEED=66eeed9d341c41e1cbe155e8a2d9d587bc9a6eb4): nine stories the press printed in the year have no headline and no first sentence. They are three candidate interviews (interview:outlet:magazine:0:national:filing:..., interview:outlet:newspaper:0:..., interview:outlet:cable:1:national:...), one bribe exposure (press.exposed:bribe:2025-07-01:...) and five stories of the same vacated U.S. Senate seat (seat-vacated:seat:US-MN:us-senate:0:2025-07-14). printedFacts in src/bench/printed-words.ts has no builder that words these, or its builder needs a fact these records lack.

**Rules.** No hand-written player text in code: the words are news and headline bank pieces. One rule, all 56 places. Ask why: name for each of the nine why it came out unworded (no builder, a missing fact) by file and line before fixing.

**Done when.** src/bench/printed-words.test.ts passes in Yankton, South Dakota with GOLDEN_PATH_SEED=66eeed9d341c41e1cbe155e8a2d9d587bc9a6eb4 and in one more drawn place with a seed the builder did not choose, each of the nine record ids above worded with a headline or a first sentence citing it, shown in the PR body; a vacated seat printed five times is one story or five different ones, with the reason.

**Files.** src/bench/printed-words.ts, data/english/parts/news.json, data/english/parts/headlines.json

**Notes.** Found Oct 29 07:20 UTC by the Words and director session running the printed-stories test for the recall count PR; red on clean main at 548ec14267 with the same seed.
