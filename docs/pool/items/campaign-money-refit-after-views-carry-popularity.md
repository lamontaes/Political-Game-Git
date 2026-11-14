---
id: campaign-money-refit-after-views-carry-popularity
title: "Every stance carries how popular its question is across the country, with donor money refit to match"
area: elections
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-views-stances-from-life
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: views thread, Nov 14 (Account lead's ruling (c) on views from life, cut 3b)
---

**What.** A person's stance on a question is their lean on its axis, their faith and degree, and their own circumstances, but not how popular the question is across the country, so a town splits near the middle on questions most of the country favors (term limits, more school spending). Every reader of how popular a question is (`publicOffset`: ballot measures, recalls, officials, the paper) already knows it; voters' own stances do not. Adding it moves the campaign money totals, so it lands with a refit of the donor share. It also retires `SG-GOV-budget-line-stance-lean-only`, whose missing term is the country's wish to spend more or less on a line. Seen: polls, door answers and votes on such questions; a candidate's money raised on the Campaign tab, and the call-time and donor-meeting results.

**Cause.** Measured: built and run on the views thread's cut 3b before the Account lead split it out. The change: `popularity(question, seed)` in `src/core2/campaign-views.ts` (`publicOffset` on the question's own axis, kept per world and question), added in `openingStance` (`src/core2/modules/views.ts`) and in `groupStance` for a counted resident (`countedStanceProfile` sets `seed`). Year 1 at three places, a town's yes share against the national poll: mean gap +0.020, +0.060 and -0.047 at Marshfield MA, South Wilton CT and Hargill TX, against -0.124, -0.081 and -0.191 without; two Marshfield township board seats changed winner; a year 3 to 5% slower. Money (`src/core2/campaign-money-calibration.test.ts`, 32 places; bands per hour 75 to 720, mean 72 to 288, median 26 to 125):

| Run seed | Run                     | Per hour | Mean gift | Median gift | Gifts |
| -------- | ----------------------- | -------- | --------- | ----------- | ----- |
| 868ab6d8 | without popularity, 2.1 | $162     | $129      | $86         | 1,204 |
| 868ab6d8 | with popularity, 2.1    | $283     | $159      | $127        | 1,710 |
| 868ab6d8 | with popularity, 2.0    | $270     | $152      | $121        | 1,710 |
| a2a0030b | without popularity, 2.1 | $183     | $130      | $97.5       | 1,354 |
| a2a0030b | with popularity, 2.0    | $318     | $163      | $134        | 1,872 |

About 40% more people have a reason to give, and the median gift crosses its cap at the second seed. Full seeds: 868ab6d8cbb6351cadd103f589af7ca01f6a44c02221caedfefa2f2d520a24f1 and a2a0030b2f1095eab0f39b4497b20553832463b4afba377945f34c99bdaad8de (sha256 of "views-3b-third"); a third, 749b9fe9 (sha256 of "views-3b-second"), stops at the known "places with a town race" red.

**Fix.** Add `popularity` to every stance as above. Then say why more givers raise the median gift rather than lower it: the new givers must be giving above the old median, so check that each new giver's gift size comes from their own record (spare money, warmth) and not from a default. Then redo the row's own fit for `donationShareOfMonthPerWarmth` (and the warmth floor if it moves): record every ask of 101 run seeds, replay them at each share and month span, choose on the fit half and check on the held-out half, fitting to the real figures the bands were drawn from (the row's and the test's sources), not to the band edges. Write the value, its spread and both halves' numbers into the row of `src/core2/data/campaigns/parameters.json`. Mark `SG-GOV-budget-line-stance-lean-only` resolved and remove its marker in `electorateSides` (`src/core2/modules/voting.ts`). Change no band of the calibration test.

**Time box.** 5 hours, Opus at medium effort, one heavy run at a time (heavy-runs).

**Rules.** No dice: real figures calibrate the totals of all gifts and never decide one donor's gift. One model, two tiers: the same popularity term for full people and counted residents. Never loosen a band of the calibration test to get green.

**Done when.** At Marshfield MA, South Wilton CT and Hargill TX, year 1, a town's yes share sits within 0.07 of the national poll on average, and the calibration test passes at the two run seeds above and a third named one; the row carries the refit value with both halves' numbers. A second session, on the train or main in a drawn place it names with its seed, runs a council campaign's call time in dev mode and sees the money raised and gifts fall inside the bands the test checks, and sees a poll in dev mode on a question the country favors come out on the popular side.

**Waits on.** `people-views-stances-from-life` cut 3b on the train.

**Files.** src/core2/campaign-views.ts, src/core2/modules/views.ts, src/core2/modules/voting.ts, src/core2/data/stopgaps/gov.json, src/core2/data/campaigns/parameters.json, src/core2/life-changes-told.test.ts, src/core2/life-stakes.test.ts

**Notes.** Nov 14 (claude, views thread): filed with cut 3b. The Account lead ruled (c): popularity leaves 3b and lands here with the refit, one item per PR, no known red onto the train. Built next by the views thread.
