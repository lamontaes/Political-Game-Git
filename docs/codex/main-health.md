# Main's health: type errors, patch notes and failing tests

Written October 8, 2026 by SONNET-CLEAN-1518. This file lists what was red on main, what each red thing was, and what happened to it. It changes no code.

## How this was measured

- Type check: `tsc -b` on the app and node projects, plus the test-import check, on main at the start (`58ba8cb`) and again on October 8, 2026 after other work merged.
- Patch notes: every note in `docs/release/changes` through `parseDeclaration` in `scripts/release/declarations.ts`.
- Tests: every test file run in chunks, one chunk at a time, with a streaming reporter; a chunk that failed or timed out was re-run file by file with a cap per file. First pass on `58ba8cb` (803 files scanned). Second pass on `8ec8fcef` for the first 130 files, and on `3c3054589` for the nationwide folder and the files after it: 199 files so far, starting with the files that failed in the first pass.
- A file that ran past the cap is recorded as a timeout, not a pass. One test file was skipped for being slow, the campaign spending reports (in #3882); no other file was known to run past 5 minutes.

## Totals

- First pass (`58ba8cb`): 803 files scanned; 220 failed, 492 failing tests.
- Second pass (`8ec8fcef` and `3c3054589`, as described above): 199 files re-run; 80 still fail, 172 failing tests.
- First-pass failures not yet re-run on the newer main: 155 files. They are listed with their first-pass message and may already be fixed.

## Type errors

| What                                                  | Count          | Status                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type errors on main when I started (`58ba8cb`)        | 65 in 40 files | Fixed in #3780; 8 hid real bugs (a study partner deciding, a finished life's family list, a Congress seat in the official-views reader, the two-person trait proof, a judge's rights outlook, the paper's line for environmental laws, a mandatory-minimum sentence lookup, contacts with no official) |
| Type errors that arrived on main while #3780 was open | 12             | Fixed in #3780 (a never-true comparison, a mistyped test table, an unhandled lived-outcome kind, a missing entity kind, a null where an optional id was expected, unbranded currency and ids)                                                                                                          |

## Patch notes that failed the parser

| What                          | Count                      | Status          |
| ----------------------------- | -------------------------- | --------------- |
| Unreadable notes at the start | 58 repaired, 2 reformatted | Merged in #3781 |
| Unreadable notes added since  | 22                         | Merged in #3831 |

## Failing test files

Each file has a kind.

- **Real bug:** the code was wrong.
- **Outdated test:** the engine changed on purpose and the test pinned the old behavior.
- **Slow under load:** the file passes alone and times out when the machine is busy.
- **Not yet traced:** the first failing assertion is shown, and the cause is not known.

Status names the pull request that fixes the file, or says open. Each message is cut to 70 characters.

### Failing in the second pass

| File                                                                 | Failing tests | First failing assertion                                                | Kind            | Why                                                                                                                                 | Status                                                 |
| -------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/player/AnchorageCampaign.test.tsx`                              | 1             | AssertionError: expected 1 to be greater than 1                        | not yet traced  |                                                                                                                                     | open                                                   |
| `src/player/CollegeStartsInTheFall.test.tsx`                         | 2             | AssertionError: expected 'This college\'s tuition or school ter…' to b | not yet traced  |                                                                                                                                     | open                                                   |
| `src/player/HomePurchasePanel.test.tsx`                              | 2             | Error: A tracked owner may have only one liquid position per currency. | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | open; file was touched by merged #3882 and still fails |
| `src/player/PanelTimeControls.test.tsx`                              | 3             | AssertionError: expected '<div><button type="button" data-testi…' to c | not yet traced  |                                                                                                                                     | open                                                   |
| `src/player/SceneConversation.test.tsx`                              | 2             | AssertionError: expected '<link rel="preload" as="image" href="…' to c | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/backdrop-anchors.test.ts`                          | 1             | AssertionError: expected 0.7979936160510716 to be less than 0.54356435 | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/big-workplace-people.test.ts`                      | 2             | AssertionError: expected 2 to be +0 // Object.is equality              | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/campaign-integration.test.ts`                      | 2             | AssertionError: expected 'ordinary-stretch' to be 'adult' // Object.is | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/coming-of-age.test.ts`                             | 2             | AssertionError: expected 'your dad' to be 'your guardian' // Object.is | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/connected-state-program-outturn.test.ts`           | 1             | AssertionError: expected null to be 'enacted' // Object.is equality    | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/content-pack-import.test.ts`                       | 2             | AssertionError: expected null not to be null                           | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/contextual-earlier-life.test.ts`                   | 10            | AssertionError: expected [ { …(6) }, { …(6) }, { …(6) }, …(23) ] to ha | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/county-government-seats.test.ts`                   | 1             | AssertionError: expected 'leader:municipal-member' to be 'leader:count | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/day-overview.test.ts`                              | 3             | AssertionError: expected null not to be null                           | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/dead-parent-card.test.ts`                          | 2             | TypeError: Cannot read properties of undefined (reading 'startsWith')  | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/death-has-a-cause.test.ts`                         | 5             | Error: No mortality window is scheduled.                               | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/dehardwire-census.test.ts`                         | 1             | AssertionError: expected [ …(8) ] to deeply equal [ …(5) ]             | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/dehardwire-measure-identity.test.ts`               | 7             | Error: No pending measure with a currently seated sponsor is recorded  | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/dehardwire-packet-coherence.test.ts`               | 1             | Error: STACK_TRACE_ERROR                                               | slow under load | Hit the 30-second test timeout while other test processes ran                                                                       | open; file was touched by merged #3702 and still fails |
| `src/presentation/districts13.test.ts`                               | 2             | AssertionError: expected [Function] to throw an error                  | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | open                                                   |
| `src/presentation/economic-context-panel.test.ts`                    | 2             | AssertionError: expected '<section class="economic-context-pane…' to c | not yet traced  |                                                                                                                                     | open                                                   |
| `src/presentation/elected-municipal-member-vote-integration.test.ts` | 1             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `src/presentation/elected-term-offer.test.ts`                        | 2             | Error: You can't run for office in Nevada this early. The game knows N | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/a15-starting-law-readers.test.ts`                    | 1             | AssertionError: expected { annual: 500, …(2) } to deeply equal { annua | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/campaign-election-floor.test.ts`                     | 1             | AssertionError: expected 0 to be greater than 50                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/campaign-support-ceiling.test.ts`                    | 1             | AssertionError: expected 0 to be greater than 20                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/campaign-week-earned-money-route.test.ts`            | 1             | AssertionError: expected false to be true // Object.is equality        | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/campaign-week-three-week-route.test.ts`              | 1             | Error: This seat is filled by district, and the filing named none. Nam | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/candidacy-enacted-qualifications.test.ts`            | 1             | AssertionError: the given combination of arguments (undefined and stri | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/candidacy-office-age.test.ts`                        | 9             | AssertionError: expected [] to include 'unproved-sourced-qualification | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/candidate-petition-review.test.ts`                   | 1             | AssertionError: expected { …(7) } to match object { …(6) }             | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/career-path7.test.ts`                                | 2             | AssertionError: expected false to be true // Object.is equality        | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/childhood-record.test.ts`                            | 1             | Error: Precinct membership requires a recorded home place.             | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/civil-personnel-actions.test.ts`                     | 6             | AssertionError: expected 'undecided' to be 'appealed' // Object.is equ | not yet traced  |                                                                                                                                     | open; file was touched by merged #3827 and still fails |
| `src/simulation/civil-personnel-import-graph.test.ts`                | 1             | AssertionError: expected [ …(21) ] to deeply equal []                  | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/county-election-term-start.test.ts`                  | 1             | Error: Future due item was skipped by authoritative time: future-due-i | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `src/simulation/couple-undecided.test.ts`                            | 1             | AssertionError: expected "evaluateDecision" to be called with argument | not yet traced  |                                                                                                                                     | open; file was touched by merged #3780 and still fails |
| `src/simulation/coverage-catalog-admission.test.ts`                  | 1             | AssertionError: expected { Object (key, parameters, ...) } to be { Obj | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/d33-education-continuity.test.ts`                    | 2             | AssertionError: expected 0 to be greater than 0                        | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/executive-authority.test.ts`                         | 3             | Error: Executive pack 'us-ne-governor-v1' presentment must resolve to  | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/executive-governing-kernels.test.ts`                 | 3             | AssertionError: expected 3 to be 2 // Object.is equality               | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/favor-collection.test.ts`                            | 3             | Error: Future due item was skipped by authoritative time: future-due-i | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `src/simulation/federal-withholding-stamp.test.ts`                   | 5             | AssertionError: expected undefined to be defined                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/formation-inputs.test.ts`                            | 1             | AssertionError: expected [ 'history.resourceFlows', …(3) ] to deeply e | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/given-name-cohorts.test.ts`                          | 1             | AssertionError: expected 0.25947745901639346 to be greater than 0.4662 | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/council-amendment-activity.test.ts`        | 1             | AssertionError: expected undefined to be defined                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/federal-law-reach.test.ts`                 | 2             | AssertionError: law:us-federal-positions:labor-commerce.raise-federal- | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/local-law-clock-parity.test.ts`            | 1             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `src/simulation/governing/local-law-money-reaches-executive.test.ts` | 1             | AssertionError: expected undefined to be defined                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/member-agenda-state-intake.test.ts`        | 1             | AssertionError: expected undefined to be defined                       | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/office-consequence.test.ts`                | 1             | AssertionError: expected 'vacancy' to be 'member' // Object.is equalit | not yet traced  |                                                                                                                                     | open                                                   |
| `src/simulation/governing/officeholder-principles.test.ts`           | 1             | AssertionError: expected 0.8140000000000001 to be close to 1.48, recei | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/budget-staffing.test.ts`                           | 2             | AssertionError: expected undefined to be truthy                        | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/council-vacancy-put-forward.test.ts`               | 1             | TypeError: .toMatch() expects to receive a string, but got undefined   | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/county-services.test.ts`                           | 3             | AssertionError: expected 0 to be greater than 0                        | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/dedicated-parks-funding.test.ts`                   | 3             | Error: Historical cutoff is after the current world date.              | not yet traced  |                                                                                                                                     | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/eviction-case.test.ts`                             | 1             | AssertionError: expected 'Mina Cortez dropped the eviction case…' to m | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/farmland-easements.test.ts`                        | 1             | Error: Historical cutoff is after the current world date.              | not yet traced  |                                                                                                                                     | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/federal-farm-subsidy-law.test.ts`                  | 2             | TypeError: actual value must be number or bigint, received "object"    | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/groundwater-limits.test.ts`                        | 1             | Error: Historical cutoff is after the current world date.              | not yet traced  |                                                                                                                                     | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/highway-money-for-transit.test.ts`                 | 1             | Error: Historical cutoff is after the current world date.              | not yet traced  |                                                                                                                                     | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/highway-money-to-riders.test.ts`                   | 1             | Error: Historical cutoff is after the current world date.              | not yet traced  |                                                                                                                                     | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/incentive-cap-law.test.ts`                         | 1             | Cannot read properties of undefined (reading 'toYes')                  | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/law-costs-reach-state-budgets.test.ts`             | 2             | TypeError: Cannot read properties of undefined (reading 'spending')    | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/law-effect-news.test.ts`                           | 2             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/law-reaches-the-player.test.ts`                    | 2             | AssertionError: expected [] to have a length of 1 but got +0           | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/player-shift-minimum-wage.test.ts`                 | 1             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `tests/nationwide/shift-payroll.test.ts`                             | 5             | AssertionError: expected { minorUnits: +0, currency: 'USD' } to deeply | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/state-minimum-wage-bill-terms.test.ts`             | 4             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open                                                   |
| `tests/nationwide/town-businesses.test.ts`                           | 1             | Error: Historical cutoff predates the person's birth.                  | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-civic-actions.test.ts`                        | 1             | AssertionError: expected 0.35555555555555557 to be less than 0.31      | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-credit-line-research-gaps.test.ts`            | 1             | Error: Historical cutoff predates the person's birth.                  | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-employment.test.ts`                           | 6             | AssertionError: Registered nurse: expected [ 'Landscaper', 'Cook', …(5 | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-families.test.ts`                             | 4             | AssertionError: expected 0 to be greater than 0                        | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-homes.test.ts`                                | 2             | AssertionError: expected 0 to be greater than 0                        | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-minimum-wage-law.test.ts`                     | 3             | Error: Missing future-transition handler for due item future-due-item_ | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | open; file was touched by merged #3892 and still fails |
| `tests/nationwide/town-pay-payroll-hook.test.ts`                     | 5             | Error: A work relationship already has a monetary compensation flow.   | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-rent-market.test.ts`                          | 1             | Error: Historical cutoff predates the person's birth.                  | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/town-rent.test.ts`                                 | 1             | Error: Historical cutoff predates the person's birth.                  | not yet traced  |                                                                                                                                     | open                                                   |
| `tests/nationwide/work-schedules.test.ts`                            | 2             | AssertionError: hospital-hallway on day 3: expected 0 to be greater th | not yet traced  |                                                                                                                                     | open                                                   |

### Failed in the first pass, not yet re-run

| File                                                                    | Failing tests | First failing assertion                                                 | Kind            | Why                                                                                                                                 | Status                                     |
| ----------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `src/player/BackdropSurfaceLayer.test.tsx`                              | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/player/CampaignActionChoicesPanel.test.tsx`                        | 1             | The seeded chapter support fixture did not grant support.               | not yet traced  |                                                                                                                                     | may be fixed by merged #3882               |
| `src/player/CampaignSpendingReports.test.tsx`                           | 1             | The committee has no money.                                             | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882               |
| `src/player/DistrictSeatFiling.test.tsx`                                | 3             | Error: A meeting needs at least 2 days' notice, and can be arranged up  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/MeetingStopActions.test.tsx`                                | 1             | expected undefined to be defined                                        | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/no-source-panel-on-a-player-screen.test.ts`                 | 1             | AssertionError: expected [ …(6) ] to deeply equal []                    | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/opening-life/LifeScenePanel.test.tsx`                       | 1             | expected null not to be null                                            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/OrdinaryMeetingPanel.test.tsx`                              | 1             | TypeError: Cannot read properties of undefined (reading 'id')           | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/PersonalLives.test.ts`                                      | 1             | AssertionError: expected '<section class="pg-split-record" data…' to c  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/PersonCard.labels.test.tsx`                                 | 7             | TypeError: Cannot read properties of undefined (reading 'home')         | not yet traced  |                                                                                                                                     | may be fixed by merged #3882               |
| `src/player/PlayerSurfaceProvenance.test.tsx`                           | 1             | AssertionError: expected '<section class="world39-reader" aria-…' to c  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/PressDeskPanel.test.tsx`                                    | 1             | This save has no recorded district leans.                               | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882               |
| `src/player/running-for-office-south-dakota.test.tsx`                   | 2             | AssertionError: expected [ [ …(2) ], [ …(2) ], [ …(2) ], …(7) ] to dee  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/player/WorldOrientationRegionPlate.test.tsx`                       | 1             | AssertionError: expected '<link rel="preload" as="image" href="…' to c  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/a-lx-receiver.test.ts`                                | 1             | Error: Missing future-transition handler for due item future-due-item_  | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | not re-run yet                             |
| `src/presentation/adaptive-life.test.ts`                                | 6             | AssertionError: expected [] to not deeply equal []                      | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/adult-start-work.test.ts`                             | 2             | AssertionError: 4470700 seed adult-work-1: expected [] to include 'org  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/all-state-transit-payment.test.ts`                    | 1             | Cannot read properties of undefined (reading 'map')                     | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/appearance-engine/collar-hair-order.test.ts`          | 8             | AssertionError: Missing native turned cell: front fallback is not coll  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/appearance-engine/expression-chooser.test.ts`         | 1             | AssertionError: expected 'neutral' to be 'laugh' // Object.is equality  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/appearance-recipe-v2.test.ts`                         | 1             | Error: Principle strength must be finite and in [0, 1].                 | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/art-coverage.test.ts`                                 | 1             | AssertionError: New uncovered cells by place and spot: expected [ …(18  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/backdrop-people.test.ts`                              | 2             | AssertionError: expected 50 to be greater than 52                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/backdrop-surfaces.test.ts`                            | 1             | AssertionError: expected [ 'appellate-courtroom', …(137) ] to deeply e  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/browser-world-repository.test.ts`                     | 1             | Error: Missing future-transition handler for due item future-due-item_  | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | not re-run yet                             |
| `src/presentation/budget-bill-passes.test.ts`                           | 1             | AssertionError: expected false to be true // Object.is equality         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/calendar-campaign-life.test.ts`                       | 1             | TypeError: Cannot read properties of null (reading 'length')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/campaign-life-answer-deadline.test.ts`                | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/campaign-life-preflight.test.ts`                      | 1             | AssertionError: expected 0 to be greater than 0                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/campaign-life-surface.test.ts`                        | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/campaign-memo.test.ts`                                | 4             | Error: This save has no recorded district leans.                        | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882               |
| `src/presentation/campaign-operating-costs.test.ts`                     | 3             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/campaign-own-money.test.ts`                           | 2             | Error: A tracked owner may have only one liquid position per currency.  | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882, merged #3887 |
| `src/presentation/campaign-projection.test.ts`                          | 13            | Error: This save has no recorded district leans.                        | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882               |
| `src/presentation/campaign-session-attend.test.ts`                      | 1             | Error: STACK_TRACE_ERROR                                                | slow under load | Hit the 30-second test timeout while other test processes ran                                                                       | not re-run yet                             |
| `src/presentation/campaign-spending-report-history.test.ts`             | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/campaign-storefront.test.ts`                          | 2             | TypeError: Cannot read properties of undefined (reading 'sourceEntityI  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/campaign-strategy.test.ts`                            | 3             | Error: This save has no recorded district leans.                        | outdated test   | A fixture built without the opening's district leans, savings or money; a fundraising session raises money only with a recorded ask | may be fixed by merged #3882               |
| `src/presentation/candidate-guidance-prose.test.ts`                     | 1             | AssertionError: expected 'Tariq Romero went over what is known …' not   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/candidate-guidance-scene.test.ts`                     | 1             | Error: STACK_TRACE_ERROR                                                | slow under load | Hit the 30-second test timeout while other test processes ran                                                                       | not re-run yet                             |
| `src/presentation/child-household-pay.test.ts`                          | 3             | AssertionError: expected +0 to be 80000 // Object.is equality           | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/civic-funded-service.test.ts`                         | 1             |                                                                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/compiled-trait-catalogue.test.ts`                     | 1             | AssertionError: expected false to be true // Object.is equality         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/congress-candidacy.test.ts`                           | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/congress-lawmaking.test.ts`                           | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/congress-member-work.test.ts`                         | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/congress-races.test.ts`                               | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/congressional-home-join.test.ts`                      | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/constitutional-reform.test.ts`                        | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/constitutional-subjects.test.ts`                      | 2             | AssertionError: expected { available: false, …(3) } to deeply equal {   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/presentation/contextual-scene-variants.test.ts`                    | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/contextual-scenes.test.ts`                            | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/presentation/crisis-disaster-handling.test.ts`                     | 2             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/campaign-operating-costs.test.ts`                       | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/campaign-routine.test.ts`                               | 2             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/campaign-week-unfunded-donor.test.ts`                   | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/dc-council-acts.test.ts`                                | 3             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/events-suffix-precondition.test.ts`                     | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/federal-farm-payments.test.ts`                          | 2             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/federal-state-program-payments.test.ts`                 | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/governing/office-continuity.test.ts`                    | 2             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/governing/program-matter-office-integration.test.ts`    | 1             | AssertionError: expected 'open' to be 'decided' // Object.is equality   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/governing/public-program-federal-outlay-metric.test.ts` | 1             | Error: organization stable key already exists: public-government:juris  | not yet traced  |                                                                                                                                     | may be fixed by merged #3807               |
| `src/simulation/governing/public-program.test.ts`                       | 1             | AssertionError: expected 'organization_9aabbc65af882720' not to be 'or  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/governing/recorded-governing-action.test.ts`            | 1             | expected false to be true // Object.is equality                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/governing/running-government-play.test.ts`              | 5             | AssertionError: expected undefined to be defined                        | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/governing/senate-selection.test.ts`                     | 2             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/governing/state-constitutional-vote.test.ts`            | 3             | Error: Missing future-transition handler for due item future-due-item_  | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | may be fixed by merged #3807               |
| `src/simulation/governing/state-disposition.test.ts`                    | 1             | AssertionError: expected [ 'AK', 'AL', 'AR', 'AZ', 'CA', …(45) ] to de  | not yet traced  |                                                                                                                                     | may be fixed by merged #3807               |
| `src/simulation/governing/state-program-existing-commitment.test.ts`    | 1             | Error: A meeting needs at least 2 days' notice, and can be arranged up  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/governing/supreme-court-appointments.test.ts`           | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/governing/vice-president-choice-required.test.ts`       | 1             | Error: The saved nominee test needs an actual appointment choice.       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/home-purchase-price-level.test.ts`                      | 5             | AssertionError: expected 193346 to be 145660 // Object.is equality      | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/household-loans.test.ts`                                | 1             | AssertionError: expected 124200 to be 110538 // Object.is equality      | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/job-offer-undecided.test.ts`                            | 1             | Cannot read properties of undefined (reading 'personId')                | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/journal-memory-tense.test.ts`                           | 1             | AssertionError: expected 159 to be greater than 200                     | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/law-exposure.test.ts`                                   | 2             | AssertionError: expected 0 to be greater than 0                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/legislation-administration-data.test.ts`                | 1             | AssertionError: expected '3c2f532c97d24a1b3f7947417ca6d0930106b…' to b  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/legislation-fiscal-data.test.ts`                        | 3             | AssertionError: expected '4cdcaae3a4d8372fc038262364feef540f0c4…' to b  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/legislation-infrastructure-data.test.ts`                | 1             | AssertionError: expected '73a0e2364b159c78c7a18febe4ea19107484b…' to b  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/legislation-origination-integrity.test.ts`              | 5             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/legislature-rule-packs-matrix.test.ts`                  | 5             | AssertionError: us-mn-legislature-v1 reuses another pack's unresolved   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/life-batch-writers.test.ts`                             | 1             | AssertionError: expected '{"format":"political-life-world","for…' to b  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/life-content-92c-grounding.test.ts`                     | 2             | Error: Invalid canonical private citizenship status history.            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/life-content-92c.test.ts`                               | 1             | AssertionError: companionship.the-friend-you-named/across-the-checkout  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/life-foundation.test.ts`                                | 1             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/life-opportunities-recorded-business.test.ts`           | 4             | Error: STACK_TRACE_ERROR                                                | slow under load | Hit the 30-second test timeout while other test processes ran                                                                       | not re-run yet                             |
| `src/simulation/life-paths2-resources.test.ts`                          | 3             | Error: Missing future-transition handler for due item future-due-item_  | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | not re-run yet                             |
| `src/simulation/life-paths2.test.ts`                                    | 3             | AssertionError: expected 100000 to be 106342 // Object.is equality      | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/living-world/congress-contest-authority.test.ts`        | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/local-economy-recorded-employer.test.ts`                | 2             | Error: STACK_TRACE_ERROR                                                | slow under load | Hit the 30-second test timeout while other test processes ran                                                                       | not re-run yet                             |
| `src/simulation/local-ordinance-game-profile.test.ts`                   | 6             | AssertionError: expected null to be 8 // Object.is equality             | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/lw08-effect-readiness.test.ts`                          | 1             | Cannot read properties of undefined (reading 'propositions')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/money-text.test.ts`                                     | 1             | AssertionError: src/presentation/routine-outcome.ts: expected 'import   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/municipal-qualification-estimate.test.ts`               | 1             | AssertionError: expected 'Minimum age: 21 (estimated)' to contain 'est  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/national-elections.test.ts`                             | 8             | Error: Future due item was skipped by authoritative time: future-due-i  | outdated test   | A hand-moved date or a registry without a handler the clock now schedules                                                           | may be fixed by merged #3824               |
| `src/simulation/office-qualification-rules.test.ts`                     | 1             | AssertionError: expected 72 to be 69 // Object.is equality              | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/opening-employer-cash.test.ts`                          | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/paid-leave-benefits.test.ts`                            | 1             | Error: A view of an official names another person.                      | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/paid-leave-estimates.test.ts`                           | 1             | Error: Pay coverage must retain every applicable dated law and excepti  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/paid-leave-stamp.test.ts`                               | 5             | Error: Completed pay must bind the worker and performed activity.       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/party-opinion-formation.test.ts`                        | 1             | AssertionError: expected [Function] to throw error matching /Unknown p  | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/paycheck-tax-bases.test.ts`                             | 5             | AssertionError: expected [ { …(18) }, { …(18) }, …(8) ] to be [ { …(18  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/pennywise-adaptive-life.test.ts`                        | 2             | AssertionError: adult.eviction-case:pay-what-is-owed has an unexpected  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/people-promise-deliberation.test.ts`                    | 1             | AssertionError: expected [ null, null, null, null, null ] to deeply eq  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/people-trait-occasions.test.ts`                         | 1             | AssertionError: expected 1 to be greater than 2                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/people-traits.test.ts`                                  | 1             | AssertionError: expected 0 to be greater than 0                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/petition-signers.test.ts`                               | 1             | Error: Invalid canonical private citizenship status history.            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/policy-packs.test.ts`                                   | 1             | Cannot read properties of undefined (reading 'propositions')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/policy-principle-weights.test.ts`                       | 1             | Cannot read properties of undefined (reading 'propositions')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/privacy-initial-compliance-writer.test.ts`              | 1             | Pay coverage must retain every applicable dated law and exception       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/protest-attendance.test.ts`                             | 1             | AssertionError: expected 'declined' to be 'published' // Object.is equ  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/public-fiscal.test.ts`                                  | 6             | TypeError: Cannot read properties of undefined (reading 'resolvedAt')   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/public-information.test.ts`                             | 5             | Error: No pending measure with a currently seated sponsor is recorded   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/public-service-producer.test.ts`                        | 2             | Error: Invalid goal-state supersession: null                            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/reach-out-cadence.test.ts`                              | 1             | AssertionError: expected 1 to be greater than 1                         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/record-in-office.test.ts`                               | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/school-moves.test.ts`                                   | 1             | Precinct membership requires a recorded home place.                     | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/school-names-measured.test.ts`                          | 1             | AssertionError: expected false to be true // Object.is equality         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/service-catalog-admission.test.ts`                      | 1             | Cannot read properties of undefined (reading 'propositions')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/stage-5-run-b.test.ts`                                  | 1             | AssertionError: expected [ { …(11) }, { …(11) }, { …(12) } ] to have a  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/stage-6-run-a.test.ts`                                  | 3             | AssertionError: expected [ { …(10) }, { …(10) }, …(3) ] to have a leng  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/stage-6-run-c.test.ts`                                  | 2             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3824               |
| `src/simulation/stage-6-run-d.test.ts`                                  | 3             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3824               |
| `src/simulation/stage-6-run-e-evidence.test.ts`                         | 2             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/stage-6-run-e-vitality.test.ts`                         | 1             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/state-tax-laws-paycheck.test.ts`                        | 5             | TypeError: Cannot read properties of undefined (reading 'find')         | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/statutory-tax.test.ts`                                  | 2             | AssertionError: expected +0 to be 7200 // Object.is equality            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/student-debt.test.ts`                                   | 3             | Error: A meeting needs at least 2 days' notice, and can be arranged up  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/tax-policy-activation.test.ts`                          | 4             | TypeError: Cannot read properties of null (reading 'jurisdictionId')    | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/tax-policy-authority.test.ts`                           | 1             | AssertionError: expected { …(10) } to be null                           | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/tax-policy.test.ts`                                     | 1             | Error: Both versions must be enacted through the canonical writers.     | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/tax-power-evidence.test.ts`                             | 1             | AssertionError: expected { …(12) } to be null                           | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/teacher-recorded-hours.test.ts`                         | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/teacher-salary-final-term.test.ts`                      | 4             | Error: Pay coverage must retain every applicable dated law and excepti  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/teacher-salary-floor.test.ts`                           | 1             | Error: Pay coverage must retain every applicable dated law and excepti  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/teacher-sponsor-floor.test.ts`                          | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/teacher-starting-law-terms.test.ts`                     | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/teacher-supported-starting-law.test.ts`                 | 1             | A view of an official names another person.                             | real bug        | A Congress seat's official view named the wrong field; fixed by the type-check pull request                                         | not re-run yet                             |
| `src/simulation/team5-principle-weights.test.ts`                        | 1             | Cannot read properties of undefined (reading 'propositions')            | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/trait-packs.test.ts`                                    | 1             | AssertionError: expected 'a lean\'s own explanation may not be …' to m  | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/act-pulls.test.ts`                               | 1             | AssertionError: expected [ …(2) ] to deeply equal []                    | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/action-despite-fear.proof.test.ts`       | 1             | TypeError: baselineConsiderations is not iterable                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/bond-loyalty.proof.test.ts`              | 1             | TypeError: baselineConsiderations is not iterable                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-affectionate-couple.proof.test.ts` | 2             | AssertionError: expected 'Affectionate' to match /warmth/               | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-affectionate.test.ts`              | 1             | AssertionError: expected [ { option: 'accept', …(3) }, …(1) ] to have   | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-intimacy-guarded.proof.test.ts`    | 1             | TypeError: baselineConsiderations is not iterable                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-inventive.test.ts`                 | 1             | AssertionError: expected null to be 'counter' // Object.is equality     | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-mischievous.proof.test.ts`         | 1             | AssertionError: expected null to deeply equal Any<String>               | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-persistent.test.ts`                | 1             | AssertionError: expected null to deeply equal Any<String>               | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/facet-tender-hearted.proof.test.ts`      | 1             | TypeError: baselineConsiderations is not iterable                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/playful-manner.proof.test.ts`            | 1             | AssertionError: expected null to be 'personality-v1:playful-manner\|cam | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/traits/effects/uncertain-outlook.proof.test.ts`         | 1             | TypeError: baselineConsiderations is not iterable                       | not yet traced  |                                                                                                                                     | not re-run yet                             |
| `src/simulation/world-integrity-deferred.test.ts`                       | 4             | AssertionError: expected [Function] to throw an error                   | outdated test   | Asserts a throw only the full World check gives; play and tests now use the changed-records check                                   | may be fixed by merged #3838               |
| `src/simulation/world.test.ts`                                          | 6             | AssertionError: expected { id: 'event_c72e68a6c7150d54', …(13) } to ma  | not yet traced  |                                                                                                                                     | not re-run yet                             |

## Test files that took two minutes or more

Seconds are wall time for the file on a shared four-core machine, so they overstate an idle run.

| File                                                          | Seconds |
| ------------------------------------------------------------- | ------- |
| `src/presentation/districts13.test.ts`                        | 448     |
| `src/player/running-for-office-governor-age.test.tsx`         | 201     |
| `src/simulation/party-chapter-names.test.ts`                  | 187     |
| `src/simulation/life-opportunities-recorded-business.test.ts` | 161     |
| `src/simulation/cost-of-living-recorded.test.ts`              | 140     |
| `src/simulation/school-names-measured.test.ts`                | 127     |
| `src/presentation/childhood.test.ts`                          | 120     |

## Files that hit the per-file cap

- `src/player/BackdropSurfaceLayer.test.tsx`
- `src/player/DistrictSeatFiling.test.tsx`
- `src/player/running-for-office-governor-age.test.tsx`
- `src/presentation/campaign-life-answer-deadline.test.ts`
- `src/presentation/campaign-operating-costs.test.ts`
- `src/presentation/campaign-session-attend.test.ts`
- `src/presentation/campaign-spending-report-history.test.ts`
- `src/presentation/civic-funded-service.test.ts`
- `src/presentation/congress-candidacy.test.ts`
- `src/presentation/congress-lawmaking.test.ts`
- `src/presentation/congress-member-work.test.ts`
- `src/presentation/congress-races.test.ts`
- `src/presentation/congressional-home-join.test.ts`
- `src/presentation/constitutional-reform.test.ts`
- `src/presentation/constitutional-subjects.test.ts`
- `src/presentation/contextual-scene-variants.test.ts`
- `src/presentation/contextual-scenes.test.ts`
- `src/presentation/council-lawmaking.test.ts`
- `src/presentation/crisis-disaster-handling.test.ts`
- `src/simulation/campaign-operating-costs.test.ts`
- `src/simulation/campaign-routine.test.ts`
- `src/simulation/campaign-week-unfunded-donor.test.ts`
- `src/simulation/dc-council-acts.test.ts`
- `src/simulation/events-suffix-precondition.test.ts`
- `src/simulation/federal-farm-payments.test.ts`
- `src/simulation/federal-state-program-payments.test.ts`
- `src/simulation/governing/office-continuity.test.ts`
- `tests/nationwide/city-minimum-wage-bill-terms.test.ts`
- `tests/nationwide/county-executive.test.ts`
- `tests/nationwide/county-row-offices.test.ts`
- `tests/nationwide/law-pay-reaches-people.test.ts`
- `tests/nationwide/local-governing-body-candidacy.test.ts`
- `tests/nationwide/local-mayor.test.ts`
- `tests/nationwide/office-pay-law.test.ts`
- `tests/nationwide/office-salary-initialization.test.ts`
- `tests/nationwide/pay-stack-ordinary-regression.test.ts`
- `tests/nationwide/player-town-payroll.test.ts`
- `tests/nationwide/primary-date-law.test.ts`
- `tests/nationwide/saved-pay-stub.test.ts`
- `tests/nationwide/speech-retelling-begin-continue.test.ts`
- `tests/nationwide/teacher-salary-floor-law.test.ts`
- `tests/nationwide/town-economy-measures.test.ts`
- `tests/nationwide/town-federal-minimum-wage-law.test.ts`
- `tests/nationwide/town-finances.test.ts`
- `tests/nationwide/town-residents.test.ts`
- `tests/nationwide/weekly-job-payroll.test.ts`

## Test files not yet scanned

1026 test files have not been run on either pass. The first pass stopped before them. They are counted by folder; the scan is still going, starting with `tests/nationwide`.

| Folder                                                               | Files |
| -------------------------------------------------------------------- | ----- |
| `src/simulation/living-world`                                        | 48    |
| `tests/source`                                                       | 47    |
| `src/simulation/outcome-web`                                         | 34    |
| `src/simulation/press`                                               | 34    |
| `src/simulation/law-consequences`                                    | 31    |
| `src/simulation/justice`                                             | 30    |
| `src/simulation/public-budgets`                                      | 29    |
| `src/simulation/crisis`                                              | 21    |
| `scripts/dev-lab`                                                    | 19    |
| `tests/nationwide`                                                   | 17    |
| `src/simulation/nationwide-world`                                    | 15    |
| `scripts/engine-proof`                                               | 13    |
| `tests/release`                                                      | 10    |
| `src/simulation/judiciary`                                           | 9     |
| `scripts/source`                                                     | 8     |
| `src/simulation/crime`                                               | 8     |
| `scripts/prose-corpus`                                               | 7     |
| `src/simulation/macro-economy`                                       | 7     |
| `src/simulation/world-setup`                                         | 6     |
| `scripts/prose-eval`                                                 | 5     |
| `scripts/art-asset-factory`                                          | 4     |
| `src/simulation/patronage`                                           | 4     |
| `src/simulation/pressure`                                            | 4     |
| `scripts/dialogue-batch`                                             | 3     |
| `tests/people`                                                       | 3     |
| `src/simulation/migration`                                           | 3     |
| `scripts/appearance`                                                 | 2     |
| `scripts/speed-years`                                                | 2     |
| `scripts/world-report`                                               | 2     |
| `tests/guards`                                                       | 2     |
| `src/simulation/nominations`                                         | 2     |
| `scripts/agent-run-receipt.test.ts`                                  | 1     |
| `scripts/agent-test-cadence.test.ts`                                 | 1     |
| `scripts/career-path7`                                               | 1     |
| `scripts/conversation-audit`                                         | 1     |
| `scripts/dialogue-report`                                            | 1     |
| `scripts/law-audit`                                                  | 1     |
| `scripts/report-check`                                               | 1     |
| `scripts/research`                                                   | 1     |
| `scripts/skill-ops`                                                  | 1     |
| `scripts/zero-dice-guard.test.ts`                                    | 1     |
| `tests/american-english-sweep.test.ts`                               | 1     |
| `tests/american-english.test.ts`                                     | 1     |
| `tests/arm-measure.test.ts`                                          | 1     |
| `tests/art-asset-factory.test.ts`                                    | 1     |
| `tests/art-preview.test.ts`                                          | 1     |
| `tests/asset-bank-inventory.test.ts`                                 | 1     |
| `tests/asset-readiness.test.ts`                                      | 1     |
| `tests/asset-requests.test.ts`                                       | 1     |
| `tests/assumption-markers.test.ts`                                   | 1     |
| `tests/authoring-ownership-boundary-harness.test.ts`                 | 1     |
| `tests/authoring-ownership-boundary.test.ts`                         | 1     |
| `tests/browser-suite-collects.test.ts`                               | 1     |
| `tests/canned-content-guard.test.ts`                                 | 1     |
| `tests/captures-stay-out-of-tracked-evidence.test.ts`                | 1     |
| `tests/cargo-disposition.test.ts`                                    | 1     |
| `tests/character-components-validation.test.ts`                      | 1     |
| `tests/character-context.test.ts`                                    | 1     |
| `tests/chatgpt-answers-checksums.test.ts`                            | 1     |
| `tests/chronic-conditions.test.ts`                                   | 1     |
| `tests/content-american-english.test.ts`                             | 1     |
| `tests/county-places.test.ts`                                        | 1     |
| `tests/dev-identified.test.ts`                                       | 1     |
| `tests/dialogue-reachability.test.ts`                                | 1     |
| `tests/donor-containment.test.ts`                                    | 1     |
| `tests/edge-despill.test.ts`                                         | 1     |
| `tests/employers-elsewhere.test.ts`                                  | 1     |
| `tests/english-counts.test.ts`                                       | 1     |
| `tests/english-era-register.test.ts`                                 | 1     |
| `tests/english-exchanges.test.ts`                                    | 1     |
| `tests/english-parts-banks.test.ts`                                  | 1     |
| `tests/environment-authoring-pipeline.test.ts`                       | 1     |
| `tests/environment-intake-jpeg.test.ts`                              | 1     |
| `tests/environment-intake-queue.test.ts`                             | 1     |
| `tests/executive-governing-ownership-boundary.test.ts`               | 1     |
| `tests/fifth-play-repair.test.ts`                                    | 1     |
| `tests/formative-eligibility.test.ts`                                | 1     |
| `tests/garment-fit-consumers.test.ts`                                | 1     |
| `tests/garment-fit-measure.test.ts`                                  | 1     |
| `tests/garment-fit-row-correspondence.test.ts`                       | 1     |
| `tests/garment-fit.test.ts`                                          | 1     |
| `tests/habs-ingestion.test.ts`                                       | 1     |
| `tests/judicial-gameplay-ownership-boundary.test.ts`                 | 1     |
| `tests/jurisdiction-table.test.ts`                                   | 1     |
| `tests/levers-and-powers-catalog.test.ts`                            | 1     |
| `tests/lives-barebones.test.ts`                                      | 1     |
| `tests/making-laws-agenda-alternatives.test.ts`                      | 1     |
| `tests/making-laws-calendar-consumers.test.ts`                       | 1     |
| `tests/making-laws-committee-attendance.test.ts`                     | 1     |
| `tests/making-laws-committee-news.test.ts`                           | 1     |
| `tests/making-laws-play.test.ts`                                     | 1     |
| `tests/making-laws-player-floor.test.ts`                             | 1     |
| `tests/making-laws-recorded-floor-session.test.ts`                   | 1     |
| `tests/making-laws-session-end-callers.test.ts`                      | 1     |
| `tests/master-inventory.test.ts`                                     | 1     |
| `tests/migration-causes.test.ts`                                     | 1     |
| `tests/mortality-calibration.test.ts`                                | 1     |
| `tests/narrative-wave-ownership-boundary.test.ts`                    | 1     |
| `tests/news-play.test.ts`                                            | 1     |
| `tests/personality-catalogue-generated.test.ts`                      | 1     |
| `tests/pg-modular-intake.test.ts`                                    | 1     |
| `tests/play-mac.test.ts`                                             | 1     |
| `tests/player-dates-are-spoken.test.ts`                              | 1     |
| `tests/player-wording.test.ts`                                       | 1     |
| `tests/player`                                                       | 1     |
| `tests/preview-store-isolation.test.ts`                              | 1     |
| `tests/production-office.test.ts`                                    | 1     |
| `tests/public-services-play.test.ts`                                 | 1     |
| `tests/research-request-store.test.ts`                               | 1     |
| `tests/runtime-asset-budget.test.ts`                                 | 1     |
| `tests/runtime-text-guard.test.ts`                                   | 1     |
| `tests/scene-people-placement.test.ts`                               | 1     |
| `tests/scene-people-wardrobe.test.ts`                                | 1     |
| `tests/seat-of-government-places.test.ts`                            | 1     |
| `tests/simulation-loads-under-tsx.test.ts`                           | 1     |
| `tests/small-world.test.ts`                                          | 1     |
| `tests/starting-law-term-completeness.test.ts`                       | 1     |
| `tests/substance-use-need.test.ts`                                   | 1     |
| `tests/transfer-seed-preferences.test.ts`                            | 1     |
| `tests/unwired-laws.test.ts`                                         | 1     |
| `tests/upbringing-from-record.test.ts`                               | 1     |
| `tests/wave-a-candidate-admission.test.ts`                           | 1     |
| `tests/wave-a-wardrobe.test.ts`                                      | 1     |
| `tests/your-day-play.test.ts`                                        | 1     |
| `tests/your-home-play.test.ts`                                       | 1     |
| `src/authoring/art-desk-cards.test.ts`                               | 1     |
| `src/authoring/art-desk-notifications.test.ts`                       | 1     |
| `src/authoring/art-desk-request-code.test.ts`                        | 1     |
| `src/authoring/art-desk.test.ts`                                     | 1     |
| `src/authoring/art-request-intake.test.ts`                           | 1     |
| `src/authoring/artbench-request-draft.test.ts`                       | 1     |
| `src/authoring/asset-bank.test.ts`                                   | 1     |
| `src/authoring/asset-inventory.test.ts`                              | 1     |
| `src/authoring/asset-lineage.test.ts`                                | 1     |
| `src/authoring/authoring-capture.test.ts`                            | 1     |
| `src/authoring/civic-symbols.test.ts`                                | 1     |
| `src/authoring/dynamic-surfaces.test.ts`                             | 1     |
| `src/authoring/external-packs.test.ts`                               | 1     |
| `src/authoring/measured-geometry.test.ts`                            | 1     |
| `src/authoring/production-library.test.ts`                           | 1     |
| `src/authoring/regional-scene-coverage.test.ts`                      | 1     |
| `src/authoring/scene-scaffold.test.ts`                               | 1     |
| `src/authoring/semantic-context.test.ts`                             | 1     |
| `src/authoring/tier-plan.test.ts`                                    | 1     |
| `src/cli/compare-seeds-options.test.ts`                              | 1     |
| `src/connectivity/connectivity-map.test.ts`                          | 1     |
| `src/connectivity/producer-links.test.ts`                            | 1     |
| `src/content/adapters`                                               | 1     |
| `src/content/content-bank.test.ts`                                   | 1     |
| `src/content/content-export.test.ts`                                 | 1     |
| `src/content/content-registry.test.ts`                               | 1     |
| `src/content/development-route.test.ts`                              | 1     |
| `src/devtools/boundary.test.ts`                                      | 1     |
| `src/devtools/causal-trace.test.ts`                                  | 1     |
| `src/devtools/decision-details.test.tsx`                             | 1     |
| `src/devtools/observer-live-trace.test.ts`                           | 1     |
| `src/devtools/observer-trace.test.ts`                                | 1     |
| `src/devtools/read-only.test.ts`                                     | 1     |
| `src/devtools/review-session.test.ts`                                | 1     |
| `src/devtools/seed-comparison.test.ts`                               | 1     |
| `src/devtools/trace-export.test.ts`                                  | 1     |
| `src/districts/congressional-lines-2026.test.ts`                     | 1     |
| `src/districts/members-per-district.test.ts`                         | 1     |
| `src/districts/query.test.ts`                                        | 1     |
| `src/education/admission-timetable-estimate-provenance.test.ts`      | 1     |
| `src/education/compact-directory-source.test.ts`                     | 1     |
| `src/education/named-colleges.test.ts`                               | 1     |
| `src/education/study-provider.test.ts`                               | 1     |
| `src/education/tuition-prices.test.ts`                               | 1     |
| `src/education/vintage.test.ts`                                      | 1     |
| `src/environment/environment-scene-spec.test.ts`                     | 1     |
| `src/environment/environment-sources.test.ts`                        | 1     |
| `src/environment/reference`                                          | 1     |
| `src/fiscal-authority/tax-powers.test.ts`                            | 1     |
| `src/maps/geometry-packs.test.ts`                                    | 1     |
| `src/maps/political-map-model.test.ts`                               | 1     |
| `src/persistence/sqlite-world-repository.test.ts`                    | 1     |
| `src/r1-review/artwork-update.test.ts`                               | 1     |
| `src/r1-review/body-change.r1.test.ts`                               | 1     |
| `src/r1-review/feature-identity.test.ts`                             | 1     |
| `src/r1-review/installed-kit.test.ts`                                | 1     |
| `src/r1-review/invalid-library.test.tsx`                             | 1     |
| `src/r1-review/missing-person-inputs.test.ts`                        | 1     |
| `src/r1-review/old-save.r1.test.ts`                                  | 1     |
| `src/r1-review/private-inputs.test.ts`                               | 1     |
| `src/r1-review/variant-cache-and-pack.r1.test.ts`                    | 1     |
| `src/research/built-since.test.ts`                                   | 1     |
| `src/research/research-request.test.ts`                              | 1     |
| `src/simulation/careers`                                             | 1     |
| `src/simulation/legislature`                                         | 1     |
| `src/simulation/regional-issues`                                     | 1     |
| `src/presentation/enacted-law-effects.test.ts`                       | 1     |
| `src/presentation/english-composition.test.ts`                       | 1     |
| `src/presentation/english-grammar.test.ts`                           | 1     |
| `src/presentation/ethics-finding-consequences.test.ts`               | 1     |
| `src/presentation/executive-bill-consolidation.test.ts`              | 1     |
| `src/presentation/executive-bill-results.test.ts`                    | 1     |
| `src/presentation/executive-inbox.test.ts`                           | 1     |
| `src/presentation/executive-office.test.ts`                          | 1     |
| `src/presentation/executive-work.test.ts`                            | 1     |
| `src/presentation/family-birthdays.test.ts`                          | 1     |
| `src/presentation/favor-collection-scene.test.ts`                    | 1     |
| `src/presentation/federal-member-bill-clock.test.ts`                 | 1     |
| `src/presentation/federal-policy-pack.test.ts`                       | 1     |
| `src/presentation/federal-reform.test.ts`                            | 1     |
| `src/presentation/felony-voting-landing.test.ts`                     | 1     |
| `src/presentation/fiscal-authority-query.test.ts`                    | 1     |
| `src/presentation/formative-context.test.ts`                         | 1     |
| `src/presentation/formative-school-name.test.ts`                     | 1     |
| `src/presentation/funded-service-capability.test.ts`                 | 1     |
| `src/presentation/funded-service-capacity-profile.test.ts`           | 1     |
| `src/presentation/funded-service-inventory.test.ts`                  | 1     |
| `src/presentation/garment-fit.test.ts`                               | 1     |
| `src/presentation/generated-school-names.test.ts`                    | 1     |
| `src/presentation/governing-legislative-clock.test.ts`               | 1     |
| `src/presentation/governing-office-desk.test.ts`                     | 1     |
| `src/presentation/governing-program-route.test.ts`                   | 1     |
| `src/presentation/governing-state-loop.test.ts`                      | 1     |
| `src/presentation/governor-continuity.test.ts`                       | 1     |
| `src/presentation/governor-desk-first-term.test.ts`                  | 1     |
| `src/presentation/governor-desk-npc.test.ts`                         | 1     |
| `src/presentation/governor-incumbent-rival.test.ts`                  | 1     |
| `src/presentation/governor-reelection.test.ts`                       | 1     |
| `src/presentation/governor-vacancy-save.test.ts`                     | 1     |
| `src/presentation/grammar-in-play.test.ts`                           | 1     |
| `src/presentation/grounded-english.test.ts`                          | 1     |
| `src/presentation/guardian-conversation.test.ts`                     | 1     |
| `src/presentation/guide-preferences.test.ts`                         | 1     |
| `src/presentation/guide-terms.test.ts`                               | 1     |
| `src/presentation/home-purchase-moving-market.test.ts`               | 1     |
| `src/presentation/home-purchase.test.ts`                             | 1     |
| `src/presentation/household-introduction.test.ts`                    | 1     |
| `src/presentation/household-papers.test.ts`                          | 1     |
| `src/presentation/incident-conditions.test.ts`                       | 1     |
| `src/presentation/installed-traits.test.ts`                          | 1     |
| `src/presentation/interruption-policy.test.ts`                       | 1     |
| `src/presentation/interruption-preferences.test.ts`                  | 1     |
| `src/presentation/job-listings-english.test.ts`                      | 1     |
| `src/presentation/job-market.test.ts`                                | 1     |
| `src/presentation/journal-chronicle.test.ts`                         | 1     |
| `src/presentation/journal-first-person.test.ts`                      | 1     |
| `src/presentation/journal-own-voice.test.ts`                         | 1     |
| `src/presentation/journal-repeats.test.ts`                           | 1     |
| `src/presentation/journal-views.test.ts`                             | 1     |
| `src/presentation/journey-then-destination.test.ts`                  | 1     |
| `src/presentation/judicial-office.test.ts`                           | 1     |
| `src/presentation/judiciary.test.ts`                                 | 1     |
| `src/presentation/justice-clemency-favor.test.ts`                    | 1     |
| `src/presentation/justice-clemency.test.ts`                          | 1     |
| `src/presentation/justice-jail-absence.test.ts`                      | 1     |
| `src/presentation/justice-jail.test.ts`                              | 1     |
| `src/presentation/justice-player-plea.test.ts`                       | 1     |
| `src/presentation/justice-pretrial.test.ts`                          | 1     |
| `src/presentation/lapse-not-refusal.test.ts`                         | 1     |
| `src/presentation/lasting-favor.test.ts`                             | 1     |
| `src/presentation/law-effects-here.test.ts`                          | 1     |
| `src/presentation/learned-traits.test.ts`                            | 1     |
| `src/presentation/legacy-unbound-district-winner.test.ts`            | 1     |
| `src/presentation/legal-record-english.test.ts`                      | 1     |
| `src/presentation/legal-record.test.ts`                              | 1     |
| `src/presentation/legislation-american-english.test.ts`              | 1     |
| `src/presentation/legislation-analysis.test.ts`                      | 1     |
| `src/presentation/legislation-bundle-amendment.test.ts`              | 1     |
| `src/presentation/legislation-bundle-composition.test.ts`            | 1     |
| `src/presentation/legislation-bundle-docket.test.ts`                 | 1     |
| `src/presentation/legislation-composition-bank.test.ts`              | 1     |
| `src/presentation/legislation-composition.test.ts`                   | 1     |
| `src/presentation/legislation-content-boundaries.test.ts`            | 1     |
| `src/presentation/legislation-content-catalog.test.ts`               | 1     |
| `src/presentation/legislation-docket-selection.test.ts`              | 1     |
| `src/presentation/legislation-docket.test.ts`                        | 1     |
| `src/presentation/legislation-estimate-action.test.ts`               | 1     |
| `src/presentation/legislation-family-bargaining.test.ts`             | 1     |
| `src/presentation/legislation-fiscal-note-coverage.test.ts`          | 1     |
| `src/presentation/legislation-integrity.test.ts`                     | 1     |
| `src/presentation/legislation-process-coverage.test.ts`              | 1     |
| `src/presentation/legislation-projection.test.ts`                    | 1     |
| `src/presentation/legislation-routes.test.ts`                        | 1     |
| `src/presentation/legislation-session-committee-report.test.ts`      | 1     |
| `src/presentation/legislation-session-hearing-calendar.test.ts`      | 1     |
| `src/presentation/legislation-world.test.ts`                         | 1     |
| `src/presentation/legislative-action-authority.test.ts`              | 1     |
| `src/presentation/legislative-authored-sitting.test.ts`              | 1     |
| `src/presentation/legislative-bargaining-cast.test.ts`               | 1     |
| `src/presentation/legislative-bargaining-declarations.test.ts`       | 1     |
| `src/presentation/legislative-bargaining-no-fixture.test.ts`         | 1     |
| `src/presentation/legislative-bargaining-office-instruction.test.ts` | 1     |
| `src/presentation/legislative-bargaining-place.test.ts`              | 1     |
| `src/presentation/legislative-bargaining-world.test.ts`              | 1     |
| `src/presentation/legislative-bargaining.test.ts`                    | 1     |
| `src/presentation/legislative-clock.test.ts`                         | 1     |
| `src/presentation/legislative-commitment-standing.test.ts`           | 1     |
| `src/presentation/legislative-committee-membership.test.ts`          | 1     |
| `src/presentation/legislative-cost-objection-english.test.ts`        | 1     |
| `src/presentation/legislative-current-member-action.test.ts`         | 1     |
| `src/presentation/legislative-executive-wait.test.ts`                | 1     |
| `src/presentation/legislative-institution-entry.test.ts`             | 1     |
| `src/presentation/legislative-member-seat.test.ts`                   | 1     |
| `src/presentation/legislative-motif-english.test.ts`                 | 1     |
| `src/presentation/legislative-multiple-seats.test.ts`                | 1     |
| `src/presentation/legislative-office-context.test.ts`                | 1     |
| `src/presentation/legislative-operation-identity.test.ts`            | 1     |
| `src/presentation/legislative-profile-hearing.test.ts`               | 1     |
| `src/presentation/legislative-referral-driver.test.ts`               | 1     |
| `src/presentation/legislative-routine-plan.test.ts`                  | 1     |
| `src/presentation/legislative-seat-legacy-migration.test.ts`         | 1     |
| `src/presentation/legislative-seat-terms.test.ts`                    | 1     |
| `src/presentation/legislative-session-window.test.ts`                | 1     |
| `src/presentation/legislative-term-blanket.test.ts`                  | 1     |
| `src/presentation/legislative-term-continuity.test.ts`               | 1     |
| `src/presentation/legislative-wait-interruption.test.ts`             | 1     |
| `src/presentation/lie-marker.test.ts`                                | 1     |
| `src/presentation/life-continuation-shell.test.ts`                   | 1     |
| `src/presentation/life-conversation-contact.test.ts`                 | 1     |
| `src/presentation/life-conversation-matters.test.ts`                 | 1     |
| `src/presentation/life-narration.test.ts`                            | 1     |
| `src/presentation/life-opacity.test.ts`                              | 1     |
| `src/presentation/life-reply-english.test.ts`                        | 1     |
| `src/presentation/life-scene.test.ts`                                | 1     |
| `src/presentation/life-so-far-english.test.ts`                       | 1     |
| `src/presentation/life-talk-answer-english.test.ts`                  | 1     |
| `src/presentation/life-talk-running-english.test.ts`                 | 1     |
| `src/presentation/life-talk-running.test.ts`                         | 1     |
| `src/presentation/life-talk-topics.test.ts`                          | 1     |
| `src/presentation/live-meeting-flow.test.tsx`                        | 1     |
| `src/presentation/lives-record.test.ts`                              | 1     |
| `src/presentation/living-scene-congress-cast.test.ts`                | 1     |
| `src/presentation/living-scene-facts.test.ts`                        | 1     |
| `src/presentation/living-world-developments.test.ts`                 | 1     |
| `src/presentation/living-world-opening.test.ts`                      | 1     |
| `src/presentation/living-world-orientation-locality.test.ts`         | 1     |
| `src/presentation/local-council-meetings.test.ts`                    | 1     |
| `src/presentation/local-economy-carried.test.ts`                     | 1     |
| `src/presentation/local-election-deceased-candidate.test.ts`         | 1     |
| `src/presentation/local-elections.test.ts`                           | 1     |
| `src/presentation/local-government-seat-gap.test.ts`                 | 1     |
| `src/presentation/local-government-seats.test.ts`                    | 1     |
| `src/presentation/local-ordinance-profile-ui.test.ts`                | 1     |
| `src/presentation/local-property-tax-world.test.ts`                  | 1     |
| `src/presentation/location-art-review.test.ts`                       | 1     |
| `src/presentation/location-surfaces.test.ts`                         | 1     |
| `src/presentation/lw16-opening-services.test.ts`                     | 1     |
| `src/presentation/macro-conditions.test.ts`                          | 1     |
| `src/presentation/mandatory-minimum-landing.test.ts`                 | 1     |
| `src/presentation/map-place-demography.test.ts`                      | 1     |
| `src/presentation/mayor-executive-decision.test.ts`                  | 1     |
| `src/presentation/meeting-home-route.test.ts`                        | 1     |
| `src/presentation/meeting-tense.test.ts`                             | 1     |
| `src/presentation/member-agenda-bills.test.ts`                       | 1     |
| `src/presentation/member-floor-vote.test.ts`                         | 1     |
| `src/presentation/member-office-staffing.test.ts`                    | 1     |
| `src/presentation/mileage-law-stamp.test.ts`                         | 1     |
| `src/presentation/modeled-account-history.test.ts`                   | 1     |
| `src/presentation/modular-source-kit.test.ts`                        | 1     |
| `src/presentation/modular41-repair.test.ts`                          | 1     |
| `src/presentation/modular45-people.test.ts`                          | 1     |
| `src/presentation/mogul-offers.test.ts`                              | 1     |
| `src/presentation/money-display.test.ts`                             | 1     |
| `src/presentation/money-laws.test.tsx`                               | 1     |
| `src/presentation/mortality-entry.test.ts`                           | 1     |
| `src/presentation/multistate-funded-service-entry.test.ts`           | 1     |
| `src/presentation/multistate-funded-service.test.ts`                 | 1     |
| `src/presentation/municipal-council-opening.test.ts`                 | 1     |
| `src/presentation/municipal-elected-seat.test.ts`                    | 1     |
| `src/presentation/municipal-governing-ballot.test.ts`                | 1     |
| `src/presentation/municipal-governing.test.ts`                       | 1     |
| `src/presentation/municipal-numbering.test.ts`                       | 1     |
| `src/presentation/municipal-orientation-holder.test.ts`              | 1     |
| `src/presentation/municipal-public-work.test.ts`                     | 1     |
| `src/presentation/municipal-qualification-filing.test.ts`            | 1     |
| `src/presentation/named-federal-and-state-holders.test.ts`           | 1     |
| `src/presentation/narrative-life.test.ts`                            | 1     |
| `src/presentation/nationwide-district-of-columbia.test.ts`           | 1     |
| `src/presentation/nationwide-local-governments.test.ts`              | 1     |
| `src/presentation/nationwide-news-officeholders.test.ts`             | 1     |
| `src/presentation/nationwide-opening.test.ts`                        | 1     |
| `src/presentation/nationwide-prior-terms.test.ts`                    | 1     |
| `src/presentation/nationwide-residence-duration.test.ts`             | 1     |
| `src/presentation/nationwide-state-executive-facts.test.ts`          | 1     |
| `src/presentation/nationwide-state-executive-journey.test.ts`        | 1     |
| `src/presentation/nationwide-state-executive-outcomes.test.ts`       | 1     |
| `src/presentation/nationwide-territory-governors.test.ts`            | 1     |
| `src/presentation/neighbor-news.test.ts`                             | 1     |
| `src/presentation/neighborhood-meeting-topic.test.ts`                | 1     |
| `src/presentation/nevada-legislator-qualification.test.ts`           | 1     |
| `src/presentation/new-game-birthday.test.ts`                         | 1     |
| `src/presentation/new-game-geography.test.ts`                        | 1     |
| `src/presentation/new-game-identity.test.ts`                         | 1     |
| `src/presentation/news-front-page.reach.test.ts`                     | 1     |
| `src/presentation/news-front-page.test.ts`                           | 1     |
| `src/presentation/news-headlines.test.ts`                            | 1     |
| `src/presentation/news-story-laws.test.ts`                           | 1     |
| `src/presentation/next24-routine-route.test.ts`                      | 1     |
| `src/presentation/no-dead-actors.test.ts`                            | 1     |
| `src/presentation/no-recurring-grocery-route.test.ts`                | 1     |
| `src/presentation/observed-traits.test.ts`                           | 1     |
| `src/presentation/observer-world.test.ts`                            | 1     |
| `src/presentation/offer-deadline-stop.test.ts`                       | 1     |
| `src/presentation/office-onboarding.test.ts`                         | 1     |
| `src/presentation/office-response-seam.test.ts`                      | 1     |
| `src/presentation/office-response.test.ts`                           | 1     |
| `src/presentation/office-transition.test.ts`                         | 1     |
| `src/presentation/official-view-talk.test.ts`                        | 1     |
| `src/presentation/old-save-override-bar.test.ts`                     | 1     |
| `src/presentation/opening-federal-geography.test.ts`                 | 1     |
| `src/presentation/opening-government-fact.test.ts`                   | 1     |
| `src/presentation/opening-jurisdiction-identity.test.ts`             | 1     |
| `src/presentation/opening-life-agency.test.ts`                       | 1     |
| `src/presentation/opening-life-boundaries.test.ts`                   | 1     |
| `src/presentation/opening-life-progress.test.ts`                     | 1     |
| `src/presentation/opening-life-recorded-employer.test.ts`            | 1     |
| `src/presentation/opening-life-recovery.test.ts`                     | 1     |
| `src/presentation/opening-life-scenes.test.ts`                       | 1     |
| `src/presentation/opening-life.test.ts`                              | 1     |
| `src/presentation/opening-prior-service.test.ts`                     | 1     |
| `src/presentation/opening-region-context.test.ts`                    | 1     |
| `src/presentation/opening-regional-plate.test.ts`                    | 1     |
| `src/presentation/opening-story.test.ts`                             | 1     |
| `src/presentation/opening-tour-people.test.ts`                       | 1     |
| `src/presentation/opening-work-location.test.ts`                     | 1     |
| `src/presentation/opening-world-snapshot.test.ts`                    | 1     |
| `src/presentation/ordinary-adult-life.test.ts`                       | 1     |
| `src/presentation/ordinary-local-fiscal-proposal.test.ts`            | 1     |
| `src/presentation/ordinary-local-service-outturn.test.ts`            | 1     |
| `src/presentation/ordinary-meeting-scene.test.ts`                    | 1     |
| `src/presentation/ordinary-state-service-cash.test.ts`               | 1     |
| `src/presentation/own-election-result-recap.test.ts`                 | 1     |
| `src/presentation/own-election-stop.test.ts`                         | 1     |
| `src/presentation/p2r1-action-memory.test.ts`                        | 1     |
| `src/presentation/p2r1-grounding.test.ts`                            | 1     |
| `src/presentation/p2r2-sustained-play.test.ts`                       | 1     |
| `src/presentation/parent-partners.test.ts`                           | 1     |
| `src/presentation/party-chapter-contact.test.ts`                     | 1     |
| `src/presentation/party-chapter-encounter.test.ts`                   | 1     |
| `src/presentation/party-chapter-surface.test.ts`                     | 1     |
| `src/presentation/pending-things-age.test.ts`                        | 1     |
| `src/presentation/people-bereavement.test.ts`                        | 1     |
| `src/presentation/people-contacts.test.ts`                           | 1     |
| `src/presentation/people-crisis-seam.test.ts`                        | 1     |
| `src/presentation/people-directory-estimate-provenance.test.ts`      | 1     |
| `src/presentation/people-family-plan.test.ts`                        | 1     |
| `src/presentation/people-generations.test.ts`                        | 1     |
| `src/presentation/people-goal-pursuit-life.test.ts`                  | 1     |
| `src/presentation/people-mind.test.ts`                               | 1     |
| `src/presentation/people-own-ties.test.ts`                           | 1     |
| `src/presentation/people1-r1.test.ts`                                | 1     |
| `src/presentation/people40-room-fit.test.ts`                         | 1     |
| `src/presentation/person-card-english.test.ts`                       | 1     |
| `src/presentation/person-dossier.test.ts`                            | 1     |
| `src/presentation/person-visual-selection.test.ts`                   | 1     |
| `src/presentation/personality-catalogue.test.ts`                     | 1     |
| `src/presentation/petition-journal.test.ts`                          | 1     |
| `src/presentation/place-backdrops.test.ts`                           | 1     |
| `src/presentation/place-conditions.test.tsx`                         | 1     |
| `src/presentation/place-hometown-population.test.ts`                 | 1     |
| `src/presentation/place-journey-backdrop.test.ts`                    | 1     |
| `src/presentation/place-names.test.ts`                               | 1     |
| `src/presentation/place-start-summary.test.ts`                       | 1     |
| `src/presentation/place-travel.test.ts`                              | 1     |
| `src/presentation/place-wiring.test.ts`                              | 1     |
| `src/presentation/play-scene-context.test.ts`                        | 1     |
| `src/presentation/played-scene-generated.test.ts`                    | 1     |
| `src/presentation/player-bill-governor-desk.test.ts`                 | 1     |
| `src/presentation/player-capabilities.test.ts`                       | 1     |
| `src/presentation/player-places.test.ts`                             | 1     |
| `src/presentation/player-pure-surfaces.test.ts`                      | 1     |
| `src/presentation/player-spine.test.ts`                              | 1     |
| `src/presentation/playtest-candidacy-alabama-qualifications.test.ts` | 1     |
| `src/presentation/playtest-candidacy-drawn-minimum-age.test.ts`      | 1     |
| `src/presentation/playtest-candidacy-residence.test.ts`              | 1     |
| `src/presentation/playtest34-c.test.ts`                              | 1     |
| `src/presentation/playtest34-life.test.ts`                           | 1     |
| `src/presentation/playtest34-ordinary-people.test.ts`                | 1     |
| `src/presentation/playtest65-visual-layout.test.ts`                  | 1     |
| `src/presentation/political-culture.test.ts`                         | 1     |
| `src/presentation/politics-government-territories.test.ts`           | 1     |
| `src/presentation/politics-government.test.ts`                       | 1     |
| `src/presentation/pose-families.test.ts`                             | 1     |
| `src/presentation/pose41-adapter.test.ts`                            | 1     |
| `src/presentation/pose41-scene-people.test.ts`                       | 1     |
| `src/presentation/posted-meeting-stop.test.ts`                       | 1     |
| `src/presentation/practical-life-journey.test.ts`                    | 1     |
| `src/presentation/pre-start-adult-history.test.ts`                   | 1     |
| `src/presentation/pre-start-character.test.ts`                       | 1     |
| `src/presentation/prepared-profile.test.ts`                          | 1     |
| `src/presentation/present-people-sentence.test.ts`                   | 1     |
| `src/presentation/president-player-desk.test.ts`                     | 1     |
| `src/presentation/presidential-elections.test.ts`                    | 1     |
| `src/presentation/presidential-terms-counted.test.ts`                | 1     |
| `src/presentation/presidential-vote-records.test.ts`                 | 1     |
| `src/presentation/press-desk-stories.test.ts`                        | 1     |
| `src/presentation/press-disclosure.test.ts`                          | 1     |
| `src/presentation/press-english.test.ts`                             | 1     |
| `src/presentation/press-request.test.ts`                             | 1     |
| `src/presentation/prior-work-evidence.test.ts`                       | 1     |
| `src/presentation/privacy-goal-answers.test.ts`                      | 1     |
| `src/presentation/production-release-boundary.test.ts`               | 1     |
| `src/presentation/production-world-pre-start-year.test.ts`           | 1     |
| `src/presentation/production-world.test.ts`                          | 1     |
| `src/presentation/program-note-not-news.test.ts`                     | 1     |
| `src/presentation/prose-dates.regression.test.ts`                    | 1     |
| `src/presentation/prose-dates.test.ts`                               | 1     |
| `src/presentation/protest-presence.test.ts`                          | 1     |
| `src/presentation/pt3-first-session.test.ts`                         | 1     |
| `src/presentation/public-service-conditions.test.ts`                 | 1     |
| `src/presentation/publish-legislative-transition.test.ts`            | 1     |
| `src/presentation/quiet-room-line.test.ts`                           | 1     |
| `src/presentation/quiet-stretch.test.ts`                             | 1     |
| `src/presentation/raster-tiers.test.ts`                              | 1     |
| `src/presentation/reaching-out-goals.test.ts`                        | 1     |
| `src/presentation/reaching-out-traits.test.ts`                       | 1     |
| `src/presentation/recall.test.ts`                                    | 1     |
| `src/presentation/recorded-room-presence.test.ts`                    | 1     |
| `src/presentation/regional-opening-corpus.test.ts`                   | 1     |
| `src/presentation/registered-trait-change.test.ts`                   | 1     |
| `src/presentation/relationship-labels.test.ts`                       | 1     |
| `src/presentation/relationship-web-connection.test.ts`               | 1     |
| `src/presentation/relationship-web.test.ts`                          | 1     |
| `src/presentation/rent-estimate.test.ts`                             | 1     |
| `src/presentation/reply-meaning.test.ts`                             | 1     |
| `src/presentation/roll-call-save.test.ts`                            | 1     |
| `src/presentation/room-media.test.ts`                                | 1     |
| `src/presentation/routine-outcome-payee.test.ts`                     | 1     |
| `src/presentation/run-a.test.ts`                                     | 1     |
| `src/presentation/run-b-conversation.test.ts`                        | 1     |
| `src/presentation/run-c-working-document.test.ts`                    | 1     |
| `src/presentation/run-d-lite.test.ts`                                | 1     |
| `src/presentation/runtime-art.test.ts`                               | 1     |
| `src/presentation/saturday-invitation.test.ts`                       | 1     |
| `src/presentation/save-larger-than-a-string.test.ts`                 | 1     |
| `src/presentation/saved-member-bill-clock.test.ts`                   | 1     |
| `src/presentation/saves-one-slot.test.ts`                            | 1     |
| `src/presentation/scene-composition.test.ts`                         | 1     |
| `src/presentation/scene-conversation-frame.test.ts`                  | 1     |
| `src/presentation/scene-conversation.test.ts`                        | 1     |
| `src/presentation/scene-fidelity.test.ts`                            | 1     |
| `src/presentation/scene-framing.test.ts`                             | 1     |
| `src/presentation/scene-occlusion.test.ts`                           | 1     |
| `src/presentation/scene-occupancy.test.ts`                           | 1     |
| `src/presentation/scene-person-reasons.test.ts`                      | 1     |
| `src/presentation/scene-placement.test.ts`                           | 1     |
| `src/presentation/scene-player-presence.test.ts`                     | 1     |
| `src/presentation/scene-registry.test.ts`                            | 1     |
| `src/presentation/scene-slot-contract.test.ts`                       | 1     |
| `src/presentation/scene-source-pose.test.ts`                         | 1     |
| `src/presentation/scene-transform.test.ts`                           | 1     |
| `src/presentation/scene-venues.test.ts`                              | 1     |
| `src/presentation/school-stages-legacy.test.ts`                      | 1     |
| `src/presentation/school-stages.test.ts`                             | 1     |
| `src/presentation/seated-chamber-votes.test.ts`                      | 1     |
| `src/presentation/setup-questionnaire-curated.test.ts`               | 1     |
| `src/presentation/sha256.test.ts`                                    | 1     |
| `src/presentation/shell-navigation.test.ts`                          | 1     |
| `src/presentation/shell-projections.test.ts`                         | 1     |
| `src/presentation/slot-contract.test.ts`                             | 1     |
| `src/presentation/small-talk-english.test.ts`                        | 1     |
| `src/presentation/social-invitation.test.ts`                         | 1     |
| `src/presentation/speaker-traits.test.ts`                            | 1     |
| `src/presentation/speech-registers.test.ts`                          | 1     |
| `src/presentation/spoken-day.test.ts`                                | 1     |
| `src/presentation/state-executive-term-description.test.ts`          | 1     |
| `src/presentation/state-legislature-filing.test.ts`                  | 1     |
| `src/presentation/state-legislature-opening.test.ts`                 | 1     |
| `src/presentation/state-legislature-turnover.test.ts`                | 1     |
| `src/presentation/state-race-result-shares.test.ts`                  | 1     |
| `src/presentation/state-tax-world.test.ts`                           | 1     |
| `src/presentation/state-voting-context-territories.test.ts`          | 1     |
| `src/presentation/story-option-note.test.ts`                         | 1     |
| `src/presentation/story-scene-day.test.tsx`                          | 1     |
| `src/presentation/story-scene-player-options.test.ts`                | 1     |
| `src/presentation/story-scene-resolver.test.ts`                      | 1     |
| `src/presentation/story-scene-situation.test.ts`                     | 1     |
| `src/presentation/study-peer-undecided.test.ts`                      | 1     |
| `src/presentation/study-peer.test.ts`                                | 1     |
| `src/presentation/study-plan-deliberation.test.ts`                   | 1     |
| `src/presentation/study-plan.test.ts`                                | 1     |
| `src/presentation/subject-reply-english.test.ts`                     | 1     |
| `src/presentation/successor-background.test.ts`                      | 1     |
| `src/presentation/surface-binding.test.ts`                           | 1     |
| `src/presentation/surface-projection.test.ts`                        | 1     |
| `src/presentation/systemic-extension.test.ts`                        | 1     |
| `src/presentation/systemic-modular.test.ts`                          | 1     |
| `src/presentation/tax-enactment-input.test.ts`                       | 1     |
| `src/presentation/team-d-three-day-route.test.ts`                    | 1     |
| `src/presentation/team-d-until-needed-route.test.ts`                 | 1     |
| `src/presentation/teen-first-job.test.ts`                            | 1     |
| `src/presentation/territory-governor-catch-up.test.ts`               | 1     |
| `src/presentation/texas-house-term.test.ts`                          | 1     |
| `src/presentation/text39-legacy-text.test.ts`                        | 1     |
| `src/presentation/time-command.test.ts`                              | 1     |
| `src/presentation/time-target-label.test.ts`                         | 1     |
| `src/presentation/title-ambient.test.ts`                             | 1     |
| `src/presentation/title-civic-rotation.test.ts`                      | 1     |
| `src/presentation/title-engine-hero.test.ts`                         | 1     |
| `src/presentation/title-lectern-hero.test.ts`                        | 1     |
| `src/presentation/title-tableau.test.ts`                             | 1     |
| `src/presentation/town-businesses.test.ts`                           | 1     |
| `src/presentation/town-hall-stand.test.ts`                           | 1     |
| `src/presentation/town-wards.test.ts`                                | 1     |
| `src/presentation/township-board-lawmaking.test.ts`                  | 1     |
| `src/presentation/transit-cash-snapshot.test.ts`                     | 1     |
| `src/presentation/transit-work.test.ts`                              | 1     |
| `src/presentation/travel-arrival-regression.test.ts`                 | 1     |
| `src/presentation/ui-core-person-visual.test.ts`                     | 1     |
| `src/presentation/ui36-shell.test.ts`                                | 1     |
| `src/presentation/unperformable-commitment.test.ts`                  | 1     |
| `src/presentation/venue-activity.test.ts`                            | 1     |
| `src/presentation/venue-contact-meeting.test.ts`                     | 1     |
| `src/presentation/venue-lapsed-invitation.test.ts`                   | 1     |
| `src/presentation/visual-integration.test.ts`                        | 1     |
| `src/presentation/walk-home-after-party-work.test.ts`                | 1     |
| `src/presentation/ward-commission-law.test.ts`                       | 1     |
| `src/presentation/won-seat-on-the-roll.test.ts`                      | 1     |
| `src/presentation/work-start-journal-english.test.ts`                | 1     |
| `src/presentation/work-uniform.test.ts`                              | 1     |
| `src/presentation/workplace-identity.test.tsx`                       | 1     |
| `src/presentation/workplace-presence.test.ts`                        | 1     |
| `src/presentation/workspace-layout.test.ts`                          | 1     |
| `src/presentation/world-change-guard.test.ts`                        | 1     |
| `src/presentation/world-orientation-live.test.ts`                    | 1     |
| `src/presentation/world-orientation.test.ts`                         | 1     |
| `src/presentation/world-recap-matters.test.ts`                       | 1     |
| `src/presentation/world-recap.test.ts`                               | 1     |
| `src/presentation/world39-editorial.test.ts`                         | 1     |
| `src/presentation/world39-laws-reach.test.ts`                        | 1     |
| `src/presentation/world39-officeholder.test.ts`                      | 1     |
| `src/presentation/world39-readers.test.ts`                           | 1     |
| `src/presentation/world46-opening.test.ts`                           | 1     |

## Source files that only tests reach: wire, keep or delete

A read-only helper listed 43 existing source files that only tests reach, on main `8ec8fcef`; it could not find two more that the board names (the cannabis tax readers, deleted in #3723). #3841 deleted 2 of the 43, so 41 remain below. That pull request said 45 and 43; the exact counts are 43 and 41, a counting slip of mine in its body. I spot-checked three rows. "Evidence" is the strongest sign of intent found in the docs. "Suggested" is my recommendation, not a decision, and no row is changed by this document.

| File                                                                                                                                          | What it does                                                     | Evidence                                                                                                                                 | Suggested                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/simulation/member-record.ts`                                                                                                             | Reads a member's dispositions, sponsorships and law effects      | Planned in `docs/codex/brief-session24-election-on-your-record-2026-10-05.md:21`                                                         | Wire                                            |
| `src/simulation/vote-readings.ts`                                                                                                             | Rates a "voted against part X" claim honest, misleading or false | Planned in `docs/codex/assignments/b09-poison-pills-riders-attack-ads.md:35`                                                             | Wire                                            |
| `src/simulation/justice/appeals.ts`                                                                                                           | Lets the losing side appeal a saved sentence                     | Board row AU3-WIRE-01, open                                                                                                              | Wire                                            |
| `src/simulation/judiciary/philosophy.ts`                                                                                                      | Records a judge's philosophy                                     | Now called when a judge is seated (`judiciary/opening.ts`); board row AU3-WIRE-02 is stale                                               | Keep; close the row                             |
| `src/simulation/justice/county-office-work.ts`                                                                                                | Reads sheriff and prosecutor work                                | Called by `county-office-reflection.ts:30`; board row AU3-WIRE-03 is stale                                                               | Keep; close the row                             |
| `src/simulation/candidate-petition-review.ts`                                                                                                 | Reviews petition signatures                                      | Board row AU3-WIRE-05, open                                                                                                              | Wire                                            |
| `src/simulation/regional-issues/regional-issues.ts`                                                                                           | Regional issues, empty for all 56 places                         | A research request exists to fill it                                                                                                     | Keep until the research lands                   |
| `src/simulation/patronage/following.ts`                                                                                                       | Who owes a person, and favors counted as support                 | Cited as existing code in the b20 elder-statesman spec                                                                                   | Keep, or delete if b20 is dropped               |
| `src/simulation/living-world/movements.ts`                                                                                                    | Read-only view of a person's movement                            | Planned as a new reader in the b20 spec                                                                                                  | Keep, or delete if b20 is dropped               |
| `src/simulation/public-budgets/mileage-law-stamp.ts`                                                                                          | Attributes the road-charge part of a settled budget              | Release note `team6-read-law-stamps.md`                                                                                                  | Keep                                            |
| `src/simulation/law-consequences/enforcement-priority.ts`                                                                                     | Orders enforcement targets by a law's priority                   | Board row RS-2450, open                                                                                                                  | Keep                                            |
| `src/simulation/press/inquiry-subpoena-rules.ts`                                                                                              | Subpoena baselines by body kind                                  | Release note `b15-p2-inquiry-subpoena-rules.md`                                                                                          | Keep                                            |
| `src/simulation/childhood-record-queries.ts`                                                                                                  | Childhood record summary                                         | No mention; three test files use it                                                                                                      | Delete with its tests, or wire into the Journal |
| `src/simulation/playable-work.ts`                                                                                                             | The list of work kinds a route plays                             | Header says law practice has "no route plays it yet"                                                                                     | Keep                                            |
| `src/simulation/legislation-bundle.ts`, `src/presentation/legislation-bundle-composition.ts`, `src/presentation/legislation-bundle-docket.ts` | A measure that carries more than one thing                       | The connectivity map says no screen reaches them; no plan                                                                                | Delete with their tests, or name the screen     |
| `src/presentation/fiscal-authority-work.ts`, `src/presentation/legislative-fiscal-proposal.ts`                                                | Open fiscal-authority work for a seat                            | `docs/systems/fiscal-authority-source.md:185` names the screen that should mount them                                                    | Wire                                            |
| `src/presentation/legislative-current-member-action.ts`, `src/presentation/legislative-routine-plan.ts`                                       | One member's floor action; a routine plan of steps               | The connectivity map says no caller                                                                                                      | Wire or delete                                  |
| `src/presentation/journal-chapters.ts`                                                                                                        | Composes life-story chapters                                     | Planned in b41 and built this week                                                                                                       | Wire                                            |
| `src/presentation/work-start-journal-english.ts`                                                                                              | English for a saved work start                                   | No mention                                                                                                                               | Wire into the Journal, or delete                |
| `src/presentation/executive-scene-offers.ts`                                                                                                  | Executive bill scene offers                                      | Veto scene is "a separate handoff"                                                                                                       | Keep                                            |
| `src/presentation/story-scene-player-options.ts`                                                                                              | Player offers inside story scenes                                | No mention; the story director design is approved                                                                                        | Wire in the story director work                 |
| `src/presentation/tax-enactment-input.ts`                                                                                                     | Inputs a tax enactment needs                                     | Cited in `docs/integration/s37-s-f-revenue-input-received.md:23`                                                                         | Keep                                            |
| `src/presentation/catalog-approval.ts`, `src/presentation/catalog-family-label.ts`                                                            | Art catalog approvals and family labels                          | Wardrobe handoff plans the label use                                                                                                     | Keep                                            |
| `src/presentation/council-meeting-agenda.ts`, `src/presentation/day-rhythm.ts`, `src/presentation/practical-activity.ts`                      | Readers with their own tests                                     | No mention                                                                                                                               | Delete with their tests, or name the screen     |
| `src/presentation/run-a-layout.ts`, `src/presentation/run-b-layout.ts`                                                                        | Scene layout anchors and validators                              | Used by the Run A and B tests only                                                                                                       | Keep                                            |
| `src/presentation/player-copy.ts`                                                                                                             | Forbidden developer phrases and refusal lines                    | Used by five test files                                                                                                                  | Keep                                            |
| `src/simulation/crisis/international-test-actors.ts`, `src/presentation/enact-law-fixture.ts`, `src/presentation/private-test-inputs.ts`      | Test helpers by their own header                                 | Used only by tests                                                                                                                       | Move under `tests/`                             |
| `src/player/CareerPathsPanel.tsx`                                                                                                             | Work-tab career panel                                            | Board row AU2-WIRE-07, open                                                                                                              | Wire                                            |
| `src/player/CandidateGuidancePanel.tsx`, `src/player/OrdinaryMeetingPanel.tsx`, `src/player/StorySceneDayPanel.tsx`                           | Older panels                                                     | Named "replacement targets" for Session 4 in `docs/codex/specs/session4-played-scenes-2026-10-06.md:343`; no shipped screen renders them | Delete once Session 4 lands                     |

## Findings that are not test failures

- **The opening posts no public meeting, on purpose, and the flow built on one has no producer.** The code comment says an opening cannot post a meeting "without a dated notice from an actual organizer", so new worlds leave the meeting history empty (`src/simulation/life-opportunities.ts:288-295`). Twelve other source files still read an activity with the stable key `ordinary-life:public-meeting:activity`, among them the attend, plan, scene and conversation code (for example the ordinary meeting actions), and nothing writes one (measured by searching the source). Ten unit test files and five browser specs look for the title "Posted public meeting". Real meeting producers exist (the municipal meeting scheduler called from the municipal workspace), but they do not use this key, so a new life cannot reach the ordinary meeting flow (inferred) until that row lands. The CTO ruled on October 8, 2026 to wire it: the municipal meeting should write the flow's key, or the flow should read the scheduler's records, with no second meeting producer (pool row MEETING-WIRE). The ten unit test files and five browser specs should then pass as written. The unit test files are campaign projection, team-d until-needed route, team-d three-day route, practical life journey, quiet stretch, live meeting flow, offer deadline stop, time command, next-24 routine route and shell projections. The browser specs are campaign party life, next-24 personal routine, playtest 65-u, session 4 shared scene and team-5 live meeting flow.
- **Writers that rely on the full World check.** The full World check reads every record at once and runs on opening or saving a game and in tests; play checks only what a write changed (`src/simulation/world-integrity-changed.ts`). The household membership writer accepts a second overlapping primary residence unless the full check runs. That is why the test at `src/simulation/life-foundation.test.ts:653-719` only throws under the full check (measured). #3838 made the tests that prove the engine refuses such a World run under the full check; it did not change the writers. I did not trace other writers. The CTO ruled on October 8, 2026 that play adds no per-write refusals: whole-world checks run in tests and at save and open only, and writers keep only cheap checks local to their own record.
- **The campaign own-money screen's "not on record" state is gone (merged in #3887).** The CTO ruled on October 8, 2026 that nothing shows unknown or blank. A recorded 0 shows as $0, and a missing value shows an estimate with its basis. The estimate is the Survey of Consumer Finances 2022 median for the candidate's pay, or for the middle fifth of income when no pay is on record. It adds no per-world spread, and whether a person with no pay should take the lowest income group's median is open.
- **A city's public account and its state's are one organization.** The public program test expects them to differ (`src/simulation/governing/public-program.test.ts:76`) and finds the same organization id for both (measured). The cause is not traced. It belongs to the simulation lane.
- **Standing-rule items.** The zero-dice guard reports nothing new on main `2c3cc9c79` (measured by `npm run zero-dice`); the pose roll and the Washington, D.C. lines in item veto that it reported earlier are gone. One item is outside the guard: the summary that a business closure writes is a hand-written sentence of the form "… closed: nobody was left to run it after …" (`src/simulation/living-world/town-finances.ts:1756`), and the project's rules forbid hand-written player text.
- **New problems keep arriving on main.** While these pull requests were open, 12 type errors and 22 unreadable patch notes landed from other work. A type check and a patch-note check on every pull request would stop that; neither is added here.
- **The farm subsidy law has no effect on farmland values.** The law's cap is read as adopted text per recipient. The aggregate cut it would produce is null whenever the law is active (`src/simulation/federal-farm-subsidy-law.ts:16-18`, read from the code), so the link from payments to land values has no input (inferred). The two failing tests in `tests/nationwide/federal-farm-subsidy-law.test.ts` still expect a positive cut. This is a gap in what a law moves, not only an outdated test.
- **A law cost lookup fails for the U.S. Virgin Islands.** `tests/nationwide/law-costs-reach-state-budgets.test.ts` reads a missing `spending` for that place (measured). The standing rule is that a fix proven in one place only is not a fix, so this belongs to the simulation lane with a test across all 56 places.

## Rulings received

The CTO answered four questions on October 8, 2026 (in a comment on pull request 3883):

1. Wire the ordinary meeting flow to the municipal meeting (pool row MEETING-WIRE).
2. Play adds no per-write refusals; whole-world checks run in tests and at save and open only.
3. Remove the "not on record" state; show the estimate with its basis (done in #3887).
4. The source files that only tests reach go to the package called P7 DIET Part 2: delete unless the game should call the file and a pool row says so.

## Questions for the owner

1. Should a person with no pay on record take the lowest income group's median ($900), not the middle group's ($7,400), for the own-money estimate?
2. Is it intended that 37 of 78 adult neighbors in the first North Dakota town have no money on record at all? (Measured while writing #3887.)
