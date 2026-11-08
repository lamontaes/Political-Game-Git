---
id: words-nation-newsworthy-by-reach-and-ties
title: "Nation story: choose other-state laws by reach and the reader's ties, not a plain two-week window"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** News under Nation (merged in #7313) tells every other-state law in the last nationNewsDays. The CTO's Nov 6 ruling: pick them with the press engine's newsworthiness rule, other states as a parameter, a data term for the reader's ties to the state (moved from, family or work there, a neighboring state) and the law's reach, no hand cap, text built when the paper opens from the stored result. In short: Nation story: choose other-state laws by reach and the reader's ties, not a plain two-week window.

**Rules.** Generate on demand (owner Nov 5); no dice, no cap; every number in a parameter table; sourced adjacency.

**Done when.** nationStories ranks and filters by reach times tie weight against a bar read from the press parameters; the player's family, job and home states raise a story; a test on a drawn place shows a story about the player's family state appears and an unrelated small state's does not; SG-WORDS-nation-window-not-interest is resolved.

**Files.** src/bench/nation-news.ts,src/core2/data/press/parameters.json,src/core2/modules/press.ts

**Notes.** State Sessions Nov 6 found the data this needs does not exist yet: no state populations in place-map.ts (reach = the state's share of the nation; sum the Census place populations or add a sourced state table), no state adjacency table (needs a sourced Census list, about 109 borders), and no moved-from history on a person (family and job places do exist). Build family and work ties first, add neighbors when the table is sourced, and keep moved-from as a registered stopgap.
