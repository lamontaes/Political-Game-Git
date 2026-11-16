# Stand-in triage: speed (Nov 10, 2026)

Owner test (Nov 10): kept 2 (with what the player sees), dropped 2 (too in depth), of which borderline 0.

Rows: 4. Still faked 3, already replaced 0, partly replaced 1, could not tell 0. Closes by: code 3, research 0, data 0, design 1, owner call 0. New items: 0.

| Stand-in                              | Still true?     | What closes it | Pool item                                                                | Size | May stay at early access?                                                                            | In plain words                                                                                                                              | Where the player sees it                    |
| ------------------------------------- | --------------- | -------------- | ------------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| SG-SPEED-fast-forward-campaigns       | still faked     | code           | none (dropped: too in depth (owner, Nov 10))                             | L    | yes: a development switch only, never in play                                                        | In the development fast-forward, campaigns take fewer turns, so a race is decided on fewer impressions than a played one.                   | dropped: too in depth (owner, Nov 10)       |
| SG-SPEED-hearer-groups                | still faked     | design         | none (dropped: too in depth (owner, Nov 10))                             | L    | yes: owner's level-of-detail ruling (Nov 9); the step-3 opening of a grouped hearer is future design | Unwatched voters who hear a world candidate's speech take their group's average reaction instead of their own.                              | dropped: too in depth (owner, Nov 10)       |
| SG-SPEED-results-mode-daily-work      | partly replaced | code           | core-fast-clock-part-4-elections-counted-from-the-voters-in-skipped-time | L    | yes: skipped time is a speed mode with monthly steps; parts 4 and 5 are open                         | In time nobody watches, the game runs each engine's monthly steps but not people's daily lives, so people do not move and nobody campaigns. | How fast the game runs when time is skipped |
| SG-SPEED-results-mode-work-attendance | still faked     | code           | core-fast-clock-skipped-year-prices-rise-more-than-a-played-year         | M    | yes: measured under half a point of price drift and under a point of joblessness in one town; marked | In a skipped month, full workers record no shifts and are paid nothing; counted workers are paid.                                           | Pay in his household across a skipped month |

## Evidence

- `SG-SPEED-fast-forward-campaigns`: src/core2/modules/campaigns.ts:6567 (marker; register had 6402); src/core2/fast-forward.ts:11-19
- `SG-SPEED-hearer-groups`: src/core2/hearer-groups.ts:111; item core-speed-hearers-as-groups is done and built the grouping, not the opening-in detail
- `SG-SPEED-results-mode-daily-work`: src/core2/life.ts:589-594 calls module.onResultsMonth for every module; onResultsMonth exists in health, grievance, finance, residents, work, renewal, place-prices, jobs and macro (grep); parts 2 and 3 items merged
- `SG-SPEED-results-mode-work-attendance`: src/core2/modules/work.ts:1003-1008 onResultsMonth only calls api.stopgap; item covers the skipped-year price symptom, not the attendance writer itself

## Questions for the owner

None.
