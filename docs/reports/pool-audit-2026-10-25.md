# Pool audit, October 25, 2026

The owner asked on Oct 25 to check every pool item: is it needed, can it be combined, is it a duplicate, is it already done. This pass read all 916 live items (open, claimed, in a PR or blocked) against main and the open and merged PRs. It applied his standing words: get things showing up in the game, only the bare minimum now, a game and not a spreadsheet, simulate it and don't ask.

## The count

| Status  | Before | After |
| ------- | -----: | ----: |
| Open    |    634 |   576 |
| Claimed |     21 |     9 |
| In a PR |    195 |   183 |
| Blocked |     66 |    37 |
| Live    |    916 |   805 |

"After" is the whole live pool on main when this report was written, so it includes the 15 new lane items and a few items other sessions added or closed in the same hour. Priority 1 went from 165 to 164 live items, priority 2 from 488 to 375, priority 3 from 263 to 266.

## What changed

- **Done: 17.** play-government-screen-capitals, world-disaster-no-outside-market, tests-played-world-challenger-lost-primary, director-civic-producers-government, gov-legislative-district-results-2024, office-m5-01-state-legislator-career (engine half), world-press-staff-same-day-exit, office-situation-room, world-territory-aides-unpaid-vi, words-batch-13, words-batch-15, world-public-employer-staff-never-paid, gov-election-cost-debt-survives-repeal, laws-checker-day-loop-money-counted-as-reader, pool-todo-shells-need-spec-oct19b, release-red-electorate-weight, core-speed-pair-key. Each was merged (its PR named it, but the done flip missed it) or found on main; the Notes say which.
- **Duplicates: 31**, dropped with "Duplicate of <keeper>" and any unique line moved to the keeper's Notes:
  - core-later-years-slower-drive-holders-offers → core-speed-contact-offers-grow-with-ties; core-town-size-census → core-census-uncap-opening; elections-local-races-share-above-band → elections-local-races-too-uncontested; gov-town-posts-counted-candidates → gov-appointments-weigh-counted-adults.
  - people-school-choice-views-and-nearby and core-private-tuition-choice-reads-beliefs → core-private-tuition-beliefs-and-schools; world-jobs-counted-chooser and world-jobs-counted-choices → world-jobs-counted-choices-one-rule.
  - words-unworded-law-meeting-blame → words-unworded-moments-remaining; people-favors-and-leaks-stopgap-sg-people-press → gov-press-favors-and-leaks; gov-press-interview-conversation → people-interview-screen.
  - world-counted-renters-buy-build → world-counted-renters-buy; world-dwelling-locations → world-dwelling-position; research-occupational-licensing-shares → research-occupational-licensing-table.
  - people-unplanned-exposure-rate-high and people-unplanned-calibration → people-unplanned-exposure-calibration; people-health-spending-flows → world-medical-spending-categories.
  - core-race-candidates-with-records-house and core-world-race-lean-candidates → core-race-candidates-who-runs.
  - Three red tests filed twice: core-counted-weight-money-small-town-red → world-counted-weight-money-few-rents; world-housing-calibration-small-counts-red → release-red-housing-calibration; guards-research-data-reader-red-on-base → release-red-research-reader-census-rerun.
  - play-job-offer-stop-continue-stuck → play-stop-23-job-offer-hold-locks-the-game; gov-standins-jobs → world-stopgap-jobs-faked-mechanic.
  - Old engine, superseded by name: world-port-town-employment, world-port-town-job-writers, people-port-traits-upbringing, core-old-imports-opening-employment and core-old-imports-opening-work → core-old-engine-03; core-port-world-scaffold and core-old-imports-generated-world → core-old-engine-04.
- **Combined: 10 keepers took in 25 items** (each part's done-when line is in the keeper's Notes and is part of its acceptance):
  1. laws-checker-first-asker-cache ← file-reads-many-laws, pass-through-poster, advocacy-money (who the law checker credits as a law's reader).
  2. laws-checker-grade-each-link-across-runs ← empty-group-counts-as-reach, lag-window-edge, subject-places (how the law matrix grades a link).
  3. tests-journal-red-on-seed-3d7f-linganore ← the Parma, North Weeki Wachee and Rio del Mar journal.test.ts failures.
  4. gov-town-payers-vehicle-tax ← its three children (household vehicles, rate, payment).
  5. people-births-ready-couples-conceive-at-once ← births-age-shape-narrow, renewalReviewDays-as-cause, births-age-shape-by-place (one births-plan change).
  6. tests-world-tests-outgrow-worker-heap ← tests-budgets-worker-heap-limit, tests-term-start-history-worker-oom (one worker-heap setting).
  7. gov-recall-bars-election-clock ← recall-bars-calendar-months, recall-bars-fraction-of-term.
  8. gov-chamber-committees-reader ← committee data A to M and N to Z.
  9. laws-other-places-chains ← its record and enacted parts.
  10. people-partnership-counted ← its leave-home and pair-and-split parts.
- **Deferred to priority 3: 73**, Notes "Deferred Oct 25: nothing on screen reads it yet". 23 research items, 19 of them "Research: sourced parameters"; the justice features (the owner put crime later on Oct 16); corruption and bribe tuning; fees, vehicle tax, recall bars and ward maps; presidential orders and pardons; counted-tier births, kin and moods; health spending; four of the combined keepers.
- **Dropped as not needed now: 57.** Most are stopgap bookkeeping at priority 3 (45): the row stays in the stopgap register, and nothing on screen reads the pool copy. The rest: roll-ups their children carry (3: gov-world-standins-oct14, core-stopgap-counted-groups-faked-mechanic, core-old-imports-opening-builders); empty shells (3: director-bring-it-up-names-signer, laws-reach-b-price-proofs, world-water-violations-producer); obsolete (4: core-speed-date-parse-callers, core-speed-observe-checks-in-play, core-speed-payday-withholding-in-play, world-macro-outside-outlays-indexed, the last by the owner's no-multiplier ruling); split already (1: laws-reach-b-schools-preschool-tuition); deferred by the owner to 1.0 (1: core-stopgap-membership-dues-assumed-data).
- **Claims released: 8.** No push in 72 hours: laws-enacted-law-reaches-nobody, core-speed-kernel-walks-no-copies, words-housing-moved-lines, words-mine-empty-cells, words-past-public-and-archive-renderings, people-corruption-honest-pull-calibrated, words-speech-craft-earned (its PR closed). world-player-household-broke-in-month-one-grangeville was in a PR that merged as another item; it is open again.
- **Unblocked: 38.** 21 blocked items set open: eleven Words items waiting on PR #5647, which merged Oct 23; core-zero-dice-shares-in-code and core-press-staff-counted-job-not-resident (their blockers are done); the two job-entry items (specced since Oct 20); four research items and core-speed-cash-journal-posting (free-text blocks); owner-bail-bonds. 17 more had a stale or free-text blocked-on cleared or re-pointed to a real item.
- **Owner questions ruled under "simulate it, don't ask": 4.** Bail bonds: yes where the state allows commercial bail (he said yes on Oct 23). Customers move between sellers by the shared chooser on price, travel time, capacity and what they heard. Old decisions compact as his Oct 20 memory ruling says. An activist offers acts only to people whose tie can top the day.
- **On-screen lines added: 351.** Every live priority 1 or 2 item outside the lane now ends its Done when with **On screen.**: 218 say "nothing yet" and name the screen it would show on, 118 say "none by design" (tests, speed, tooling, cleanup), and 15 name a new lane item.
- **Lane items filed: 15**, all priority 2, size S, three hours, added to `docs/play-first/ORDER.md` as Tier 4: play-local-races-on-screen, play-prior-budgets-on-screen, play-circle-changes-on-screen, play-other-states-news-on-screen, play-town-moves-on-screen, play-local-layoffs-on-screen, play-home-sales-on-screen, play-official-ties-on-screen, play-governor-races-on-screen, play-town-paper-on-screen, play-city-books-on-screen, play-move-out-on-screen, play-job-openings-on-screen, play-issue-stances-on-screen, play-why-they-chose-on-screen.

## Where the weight is

The 15 seams with the most live items after the audit:

| Seam                                 | Live | Priority 1 |
| ------------------------------------ | ---: | ---------: |
| play-stop (the lane's playtest bugs) |   39 |         32 |
| core-speed                           |   21 |          3 |
| play-first (the lane's mock fixes)   |   20 |         20 |
| world-counted (the counted tier)     |   12 |          1 |
| gov-justice                          |   10 |          0 |
| release-audit (in PRs)               |   10 |          0 |
| core-stopgap                         |    9 |          0 |
| gov-redistricting                    |    9 |          0 |
| core-old (the old engine's removal)  |    8 |          6 |
| laws-nine-links                      |    8 |          8 |
| roadmap-m1                           |    8 |          1 |
| words-speech                         |    8 |          1 |
| core-opening                         |    7 |          1 |
| words-journal                        |    7 |          6 |
| words-scene                          |    7 |          5 |

By area: core 137, world 127, gov 105, people 105, play 85 plus the 15 new lane items, words 82, laws 82.

## Left alone

- play-first-05-v1-figures-removed and play-stop-03-player-drawn-as-strangers: PR #5898 merged, but the CTO's note says the owner's installed-build check closes them.
- The bench-and-installed pairs that share one PR (play-day-lands-at-midnight with play-stop-07-a, play-election-night-own-race-first with play-stop-22-a, play-panels-see-through with play-stop-17, play-screens-codes-and-iso-dates with play-stop-02-b, play-teen-has-current-high-school with play-stop-08), and campaigns-canvass-reaches-nobody-for-months and play-campaign-doors-go-round-again beside play-stop-25 on PR #6065: they look like duplicates but are deliberate halves with open PRs.
- elections-polls-core2: its Notes say the poll is built, but PR #5815 adds the test it asks for.
- core-speed-module-table-play-path: its Notes recommend dropping it, but a session claimed it again tonight.
- Not combined because the result would pass size L or a part has an open PR: the four gov-justice-counted items, the five words-journal lines, the three scene-lead items, people-drives-counted-speech-and-shared-causes.
- PRs that can now be closed: #5806, #5483, #5823, #5340, #4146 (their items were dropped as duplicates or roll-ups).
