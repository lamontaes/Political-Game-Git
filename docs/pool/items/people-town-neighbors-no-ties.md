---
id: people-town-neighbors-no-ties
title: "Small towns open with no ties between neighbors, so word of mouth has no road inside the town"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Cave, Missouri (place key 2912079, seed 89974afab8e8ef9592bf602b64510149e1b7a1423695217f04d8ee4e19eb39c4) all 3,388 relationships of town residents at the opening are family ties to people in other places, and none joins two townspeople; Ardmore, South Dakota (4601980, seed ba59c26d1f61c83d124db465347ef97b9619620ebd5e12c6efb190ad2fb1e06f) is the same (3,252). Only 9 in-town contact ties form in 90 days, and 64 of 4,597 contacts in 30 days are between two townspeople. Roadmap M2-09's news test (accepted) fails there because no resident is told a story by a neighbor. Found by the M0-M2 lead's helper on tests-news-no-outlet-reader-small-place.

**Rules.** One model, two tiers: neighbors, coworkers and congregation ties in a town must come from where people live, work and gather, read the same way for full people and counted groups, never added by a test.

**Done when.** In Cave, Missouri and Ardmore, South Dakota (seeds above) and two more drawn places, residents open with ties to other townspeople (neighbors, coworkers, classmates) by record id, and src/core2/news.test.ts passes unchanged there; the cause is named by line in the PR.

**Files.** src/core2/opening-peer-network.ts (the opening ties), and the contact engine the life loop runs (src/core2/life-contact-frequency.test.ts covers it)

**Notes.** TODO
