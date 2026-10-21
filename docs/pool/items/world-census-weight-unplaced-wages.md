---
id: world-census-weight-unplaced-wages
title: "The unplaced workers' pay stands for as many workers as the town's weight says"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/unplaced-wages-weighted-s5
pr: #4862
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T02:48:46.604Z
---

**What.** In a town opened at a count scale above one (Washington, D.C. at scale 69, seed `big1`), the place's unplaced-workers wage flow (`residents:unplaced-wages:<place>`, built in `src/core2/residents.ts` and shared out in `packOpening`, `src/core2/modules/residents.ts`) is not multiplied by the town's weight: its total is the sample's (about $20 million over 30 days at scale 1 and $25 million at scale 69) while the people it pays are 15 times as many. Over 30 days the counted groups' funds take in $440 per weighted person at scale 1 and $34 at scale 69 from this flow, the groups' cushions drain, the counted seekers triple (343 to 1,020 in 40 days) and constituent cases and fill-ins follow (68 to 245 fill-ins in 60 days). Weight the flow: its amount and its worker count by the place's weight in `collapseToTwoLevels`, the eligible pool in `packOpening` by each household's weight, and `unplacedShare` (the share a filled-in household takes out of the flow) by the weights, so one household's unplaced pay stays one household's.

**Rules.** One model, two tiers: the same pay per worker, times the count. No dice. Every dollar balances. Speed: no more than 20 percent slower than base.

**Done when.** In a one-year run of the played world in a drawn town above 10,000 opened at its Census scale (name the place and seed), the unplaced-workers flow's total per weighted person is within 25 percent of the scale-one town's, the groups' funds per weighted person stay within a fifth of the scale-one town's after 40 days, and the counted-seeker and fill-in counts per weighted person do not rise with the scale. A test beside `counted-weight-money.test.ts` states it.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/counted-reach.ts

**Notes.** Found trying to uncap the opening (core-census-uncap-opening). A per-reason view of what enters and leaves the group funds, by the journal entry's source id, over 30 days (`/tmp` script; reproduce by wrapping `api.postJournal` and summing postings to `rt.funds` accounts), shows other lines whose totals do not track the weight either (rent, retirement, owner draws, outside living, and a `bank-deposit` line of -$128 per weighted person at scale 69 that is absent at scale 1); the fitted weights differ by household type, so those need a per-type comparison. File each as its own item.
