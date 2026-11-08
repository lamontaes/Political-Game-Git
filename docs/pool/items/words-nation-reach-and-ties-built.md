---
id: words-nation-reach-and-ties-built
title: "Nation story: other-state laws chosen by reach and the reader's ties"
area: words
kind: feature
priority: 2
size: M
status: claimed
claimed-by: nation-newsworthy
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-08T00:25:39.134Z
---

**What.** News under Nation told every other-state law in a two-week window. The CTO's Nov 6 ruling: pick them by reach and the reader's ties, no hand cap, built when the paper opens.

**Rules.** Generate on demand (owner Nov 5); no dice, no cap; every number in a parameter table; sourced population and borders.

**Done when.** nationStories scores a law as its state's share of the nation times one plus the reader's family, work and neighbor ties against nationNewsReachBar; the data is the Census population and county adjacency; a test on a drawn place shows fewer stories than laws and each told story at or above the bar.

**Files.** src/bench/nation-news.ts,src/core2/data/places/state-reach.json,scripts/research/build-state-reach.py,src/core2/data/parameters.json

**Notes.** TODO
