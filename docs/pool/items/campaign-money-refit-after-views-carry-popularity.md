---
id: campaign-money-refit-after-views-carry-popularity
title: "A voter's view carries how popular its question is across the country, and a candidate's platform does not"
area: elections
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude (views thread)
pr: 9307
after: people-views-stances-from-life
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: views thread, Nov 14 (Account lead's ruling (c) on views from life, cut 3b)
---

**What.** A person's stance on a question is their lean on its axis, their faith and degree, and their own circumstances, but not how popular the question is across the country, so a town splits near the middle on questions most of the country favors (term limits, more school spending). Every reader of how popular a question is (`publicOffset`: ballot measures, recalls, officials, the paper) already knows it; voters' own stances do not. It also retires `SG-GOV-budget-line-stance-lean-only`, whose missing term is the country's wish to spend more or less on a line. Seen: polls, door answers and votes on such questions, and the Campaign tab's money raised, which must not move outside its bands.

**Cause.** Measured: on the views thread's cut 3b before the Account lead split it out. Adding `popularity(question, seed)` (`src/core2/campaign-views.ts`) to every stance, candidates' included, moved the campaign money totals (`src/core2/campaign-money-calibration.test.ts`, 32 places; bands per hour 75 to 720, mean 72 to 288, median 26 to 125):

| Run seed | Run                                   | Per hour | Mean gift | Median gift | Gifts |
| -------- | ------------------------------------- | -------- | --------- | ----------- | ----- |
| 868ab6d8 | without popularity, 2.1               | $162     | $129      | $86         | 1,204 |
| 868ab6d8 | popularity in every stance, 2.1       | $283     | $159      | $127        | 1,710 |
| 868ab6d8 | popularity in voters' views only, 2.1 | in band  | $124      | $88.5       | 1,404 |
| a2a0030b | without popularity, 2.1               | $183     | $130      | $97.5       | 1,354 |
| a2a0030b | popularity in every stance, 2.1       | not kept | $171      | $141        | 1,872 |
| a2a0030b | popularity in voters' views only, 2.1 | in band  | $125      | $96         | 1,611 |

Why the median rose, from every gift dumped at a2a0030b: the 520 new givers gave a median $37 (their reason to give a median 0.056); the 1,352 who gave in both runs went from a median $98 to $182, because their reason to give doubled (0.125 to 0.234) and a gift is reason times what their own records say they can spare. The reason doubled because popularity moved the candidates too: at Marshfield MA (75d9b7ad), the township board seat 0 race on Oct 15 went from rivals on opposite sides of 25 and 21 of 26 questions to no pair opposed on more than 5 of 29, so every voter agreed more with every candidate. Full seeds: 868ab6d8cbb6351cadd103f589af7ca01f6a44c02221caedfefa2f2d520a24f1 and a2a0030b2f1095eab0f39b4497b20553832463b4afba377945f34c99bdaad8de.

**Fix.** Popularity goes into every voter's view: `openingStance` in `src/core2/modules/views.ts` for a full person, `groupStance` for a counted resident (`countedStanceProfile` sets `seed`). A candidate's platform stance reads `ownOpeningStance` (lean, faith and degree, own life, plus heard), without the country's popularity (`StanceReader` in `src/core2/campaign-stances.ts`): a platform answers to party, record and own life, not national polls. The donor share stays 2.1. Delete the `SG-GOV-budget-line-stance-lean-only` row from the register and its marker in `electorateSides` (`src/core2/modules/voting.ts`). Pinned test `src/core2/candidate-platform-spread.test.ts` (Marshfield MA): a pair of rivals in the board seat 0 race stands on opposite sides of more than half the questions they share. The older gift skew (mean 1.3 times the median against a real 2.9) is its own item, `campaign-money-gift-skew-fit-share-and-span`; candidates shading toward what their own district favors is `candidacy-platform-shades-toward-district-by-traits`.

**Time box.** 5 hours, Opus at medium effort.

**Rules.** No dice: a voter's own view and the country's polled share decide. One model, two tiers: the same popularity term for full people and counted residents. Never loosen a band of the calibration test to get green.

**Done when.** At Marshfield MA, South Wilton CT and Hargill TX, year 1, a town's yes share sits nearer the national poll than without popularity, and the calibration test passes at the two run seeds above with the share unchanged; the pinned rivals test passes. A second session, on the train or main in a drawn place it names with its seed, sees in dev mode a poll on a question the country favors come out on the popular side, and rivals in a town race on opposite sides of most questions on the Campaign tab.

**Waits on.** `people-views-stances-from-life` cut 3b on the train.

**Files.** src/core2/campaign-views.ts, src/core2/modules/views.ts, src/core2/campaign-stances.ts, src/core2/modules/voting.ts, src/core2/data/stopgaps/gov.json, src/core2/life-changes-told.test.ts, src/core2/life-stakes.test.ts, src/core2/candidate-platform-spread.test.ts (new)

**Notes.** Nov 14 (claude, views thread): filed with cut 3b. The Account lead ruled (c): popularity leaves 3b and lands here, one item per PR. The refit this item first named was not needed once candidates' platforms left popularity out (the Account lead's ruling, Nov 14).
