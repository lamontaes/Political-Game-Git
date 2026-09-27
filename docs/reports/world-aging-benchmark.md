# In Columbus, Ohio, a Day in year 5 costs 3.7 times what it cost in year 1

A world with nobody played ran in Columbus, Ohio for 5 game years, one Day at a time, from January 5, 2026 to January 5, 2031. The median Day took 79 ms of processor time in year 1 and 297 ms in year 5. The slowest 5 percent of Days took 309 ms and 480 ms. The save grew from 2.7 MiB at the opening to 29 MiB, and reopening it took 2661 ms. The history went from 2,158 records to 37,120. Other work kept this computer busy throughout (load average 49.9 to 156.5 on 8 cores), so compare years rather than single numbers.

## Day time, per game year

CPU is this process's processor time for one press of the Day button; wall is the time a person would have waited on this busy computer. Rows marked * ran under the CPU profiler.

| Year | Dates | Days | Median Day CPU (ms) | p95 Day CPU (ms) | Slowest Day CPU (ms) | Median Day wall (ms) | p95 Day wall (ms) | Year CPU (s) | Year wall (s) | Load avg |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1* | 2026-01-05 to 2027-01-05 | 365 | 79 | 309 | 1376 | 99 | 521 | 45.9 | 73.3 | 156.5 |
| 2 | 2027-01-05 to 2028-01-05 | 365 | 88 | 200 | 390 | 118 | 234 | 37.6 | 48.6 | 145.9 |
| 3 | 2028-01-05 to 2029-01-05 | 366 | 114 | 256 | 511 | 151 | 323 | 50 | 62.5 | 117.9 |
| 4 | 2029-01-05 to 2030-01-05 | 365 | 228 | 395 | 794 | 267 | 443 | 91.2 | 104.4 | 80.8 |
| 5* | 2030-01-05 to 2031-01-05 | 365 | 297 | 480 | 1230 | 337 | 589 | 121 | 140.4 | 49.9 |

## Save size, save and reopen, per game year

| Year | Date | People | Save size | Save CPU (ms) | Save wall (ms) | Reopen CPU (ms) | Reopen wall (ms) | Heap (MiB) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 2026-01-05 (opening) | – | 2.7 MiB | 145 | 498 | 343 | 699 | – |
| 1 | 2027-01-05 | 921 | 11.5 MiB | 315 | 445 | 755 | 800 | 557 |
| 2 | 2028-01-05 | 935 | 15 MiB | 385 | 491 | 730 | 880 | 1105 |
| 3 | 2029-01-05 | 1057 | 20.6 MiB | 558 | 642 | 1187 | 1313 | 1147 |
| 4 | 2030-01-05 | 1065 | 24.4 MiB | 761 | 924 | 1897 | 1846 | 725 |
| 5 | 2031-01-05 | 1170 | 29 MiB | 884 | 1342 | 2661 | 2664 | 831 |

Every reopened save came back on the same date with the same number of records in every history array.

## What the CPU profile says grew

Year 1 (365 Days) against year 5 (365 Days), in milliseconds per Day of sampled time (the sampler counts wall time on the main thread, so a busy computer inflates both years). "Self" is time with the function itself on top of the stack; that is where a repeated scan of a growing array shows up, usually as the small callback passed to `filter`, `find` or `some`. "Inclusive" also counts everything it called.

### The 15 functions whose own time grew most

| # | Function (file:line) | Year 1 ms/Day | Year 5 ms/Day | Growth ms/Day |
| ---: | --- | ---: | ---: | ---: |
| 1 | `validateProvenance (src/simulation/life-integrity.ts:1359)` | 0.66 | 45.62 | 44.96 |
| 2 | `(anonymous) (src/simulation/national-elections.ts:80)` | 0.00 | 22.85 | 22.85 |
| 3 | `(garbage collector)` | 16.77 | 36.12 | 19.35 |
| 4 | `assertNationalElectionIntegrity (src/simulation/national-elections.ts:1023)` | 0.00 | 12.90 | 12.89 |
| 5 | `validateNationalRecord (src/simulation/national-elections.ts:520)` | 0.00 | 11.95 | 11.95 |
| 6 | `byId (src/simulation/life-integrity.ts:1534)` | 0.81 | 11.12 | 10.31 |
| 7 | `assertFutureTransitionIntegrity (src/simulation/future-transitions.ts:647)` | 0.93 | 8.89 | 7.96 |
| 8 | `(anonymous) (src/simulation/legislation.ts:1364)` | 0.86 | 7.93 | 7.07 |
| 9 | `validateHistoryIntegrity (src/simulation/world.ts:1702)` | 10.86 | 17.48 | 6.62 |
| 10 | `assertLegislationIntegrity (src/simulation/legislation-integrity.ts:101)` | 1.36 | 7.88 | 6.52 |
| 11 | `assertHistoryIdentity (src/simulation/future-transitions.ts:994)` | 0.60 | 7.01 | 6.41 |
| 12 | `indexOverArrays (src/simulation/history-index.ts:61)` | 0.15 | 3.80 | 3.65 |
| 13 | `assertPublicInformationIntegrity (src/simulation/public-information-integrity.ts:168)` | 0.52 | 3.81 | 3.29 |
| 14 | `assertUniqueId (src/simulation/world.ts:1672)` | 5.44 | 8.43 | 2.99 |
| 15 | `assertJsonSafe (src/simulation/world.ts:3854)` | 1.68 | 4.53 | 2.85 |

### The 15 functions whose inclusive time grew most

| # | Function (file:line) | Year 1 ms/Day | Year 5 ms/Day | Growth ms/Day |
| ---: | --- | ---: | ---: | ---: |
| 1 | `validateHistoryIntegrity (src/simulation/world.ts:1702)` | 93.11 | 260.66 | 167.54 |
| 2 | `assertWorldIntegrity (src/simulation/world.ts:583)` | 112.26 | 279.04 | 166.79 |
| 3 | `validateWorldIntegrity (src/simulation/world.ts:590)` | 112.24 | 279.01 | 166.77 |
| 4 | `press (scripts/dev-lab/world-aging.ts:107)` | 176.06 | 337.91 | 161.85 |
| 5 | `passOrdinaryDays (src/presentation/ordinary-life.ts:365)` | 176.05 | 337.90 | 161.85 |
| 6 | `advanceWithWorldIntegrityAtEnd (src/simulation/world.ts:577)` | 176.05 | 337.90 | 161.85 |
| 7 | `advanceObservedWorld (src/presentation/observer-world.ts:109)` | 176.06 | 337.90 | 161.84 |
| 8 | `(anonymous) (scripts/dev-lab/world-aging.ts:694)` | 176.14 | 337.93 | 161.79 |
| 9 | `profiled (scripts/dev-lab/world-aging.ts:479)` | 178.24 | 338.97 | 160.73 |
| 10 | `assertNationalElectionIntegrity (src/simulation/national-elections.ts:1023)` | 0.00 | 57.11 | 57.11 |
| 11 | `validateProvenance (src/simulation/life-integrity.ts:1359)` | 0.90 | 56.31 | 55.41 |
| 12 | `assertLifeHistoryIntegrity (src/simulation/life-integrity.ts:233)` | 22.07 | 69.88 | 47.81 |
| 13 | `validateNationalRecord (src/simulation/national-elections.ts:520)` | 0.00 | 43.65 | 43.65 |
| 14 | `indexOverArrays (src/simulation/history-index.ts:61)` | 1.45 | 37.16 | 35.71 |
| 15 | `validateProvenance (src/simulation/national-elections.ts:125)` | 0.00 | 26.38 | 26.38 |

### Where a Day's own time went in year 5

| # | Function (file:line) | Own ms/Day | Inclusive ms/Day |
| ---: | --- | ---: | ---: |
| 1 | `validateProvenance (src/simulation/life-integrity.ts:1359)` | 45.62 | 56.31 |
| 2 | `(garbage collector)` | 36.12 | 36.12 |
| 3 | `(anonymous) (src/simulation/national-elections.ts:80)` | 22.85 | 22.92 |
| 4 | `validateHistoryIntegrity (src/simulation/world.ts:1702)` | 17.48 | 260.66 |
| 5 | `assertNationalElectionIntegrity (src/simulation/national-elections.ts:1023)` | 12.90 | 57.11 |
| 6 | `validateNationalRecord (src/simulation/national-elections.ts:520)` | 11.95 | 43.65 |
| 7 | `byId (src/simulation/life-integrity.ts:1534)` | 11.12 | 11.12 |
| 8 | `assertFutureTransitionIntegrity (src/simulation/future-transitions.ts:647)` | 8.89 | 24.78 |
| 9 | `assertUniqueId (src/simulation/world.ts:1672)` | 8.43 | 9.90 |
| 10 | `(anonymous) (src/simulation/legislation.ts:1364)` | 7.93 | 7.93 |
| 11 | `assertLegislationIntegrity (src/simulation/legislation-integrity.ts:101)` | 7.88 | 14.90 |
| 12 | `assertCanonicalEntityIds (src/simulation/world.ts:3591)` | 7.66 | 7.66 |
| 13 | `assertLifeHistoryIntegrity (src/simulation/life-integrity.ts:233)` | 7.40 | 69.88 |
| 14 | `assertHistoryIdentity (src/simulation/future-transitions.ts:994)` | 7.01 | 8.45 |
| 15 | `validatePoliticalHistory (src/simulation/world.ts:2812)` | 5.52 | 30.80 |

## How many records each history array holds

At the opening and at the end of each game year. Arrays that stayed empty the whole run are listed after the table.

| Array | Opening | Y1 | Y2 | Y3 | Y4 | Y5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| events | 562 | 2629 | 3778 | 5946 | 7212 | 9391 |
| principles | 0 | 5211 | 5425 | 6045 | 6261 | 6292 |
| futureDueItemStates | 14 | 1104 | 2170 | 3331 | 4603 | 5882 |
| futureDueItems | 14 | 569 | 1104 | 1683 | 2324 | 2960 |
| legislativeActions | 0 | 400 | 812 | 1212 | 1642 | 2064 |
| crisisRecords | 0 | 160 | 313 | 645 | 1383 | 2008 |
| pressRecords | 21 | 418 | 777 | 1146 | 1370 | 1561 |
| decisionTraces | 0 | 227 | 422 | 633 | 752 | 854 |
| nationalElectionRecords | 0 | 0 | 0 | 650 | 657 | 657 |
| legislativeVotes | 0 | 115 | 236 | 353 | 482 | 607 |
| publications | 2 | 126 | 236 | 340 | 420 | 489 |
| knowledge | 1 | 67 | 109 | 206 | 320 | 433 |
| organizationParticipationStates | 234 | 256 | 264 | 294 | 294 | 312 |
| organizationParticipations | 234 | 256 | 260 | 290 | 290 | 308 |
| workStatuses | 157 | 214 | 215 | 266 | 268 | 305 |
| personFunctionalCapacities | 0 | 13 | 35 | 77 | 172 | 265 |
| committeeReferrals | 0 | 51 | 101 | 150 | 201 | 251 |
| committeeActions | 0 | 48 | 97 | 146 | 197 | 248 |
| workRelationships | 156 | 184 | 185 | 212 | 214 | 233 |
| workRoles | 156 | 184 | 185 | 212 | 214 | 233 |
| scheduledActivities | 0 | 32 | 72 | 108 | 146 | 170 |
| scheduledActivityStates | 0 | 32 | 72 | 108 | 146 | 170 |
| householdMembershipStates | 119 | 125 | 131 | 136 | 141 | 144 |
| householdMemberships | 118 | 124 | 130 | 135 | 140 | 143 |
| legislativeMeasures | 0 | 27 | 54 | 81 | 108 | 135 |
| propositionExposures | 0 | 27 | 54 | 81 | 108 | 135 |
| executiveDispositions | 0 | 22 | 45 | 67 | 91 | 115 |
| partyRecords | 2 | 18 | 43 | 67 | 91 | 115 |
| legislativeEnactments | 0 | 22 | 44 | 66 | 88 | 110 |
| householdLocations | 54 | 61 | 69 | 75 | 83 | 92 |
| households | 53 | 59 | 65 | 70 | 75 | 78 |
| kinshipRelationships | 55 | 55 | 55 | 55 | 55 | 55 |
| personDeaths | 0 | 5 | 19 | 36 | 43 | 52 |
| organizationProfiles | 34 | 37 | 38 | 38 | 40 | 40 |
| organizations | 34 | 37 | 38 | 38 | 40 | 40 |
| educationEnrollmentStates | 26 | 32 | 32 | 32 | 32 | 32 |
| educationEnrollments | 23 | 26 | 26 | 26 | 26 | 26 |
| personalityTendencies | 8 | 25 | 25 | 25 | 25 | 25 |
| partnershipStates | 22 | 22 | 22 | 22 | 22 | 22 |
| partnerships | 22 | 22 | 22 | 22 | 22 | 22 |
| personalValues | 12 | 12 | 12 | 12 | 12 | 12 |
| relationshipInteractions | 8 | 8 | 8 | 8 | 8 | 8 |
| goalStates | 4 | 4 | 4 | 4 | 4 | 4 |
| officeStaffPositions | 0 | 3 | 3 | 3 | 3 | 3 |
| worldConditions | 3 | 3 | 3 | 3 | 3 | 3 |
| childAuthorityStates | 2 | 2 | 2 | 2 | 2 | 2 |
| districtResidenceIntervals | 2 | 2 | 2 | 2 | 2 | 2 |
| electionContestResults | 0 | 1 | 1 | 1 | 1 | 2 |
| electionContests | 0 | 1 | 1 | 1 | 1 | 2 |
| appraisals | 1 | 1 | 1 | 1 | 1 | 1 |
| careResponsibilities | 1 | 1 | 1 | 1 | 1 | 1 |
| careResponsibilityStates | 1 | 1 | 1 | 1 | 1 | 1 |
| childAuthorities | 1 | 1 | 1 | 1 | 1 | 1 |
| lifeCommitments | 1 | 1 | 1 | 1 | 1 | 1 |
| memories | 1 | 1 | 1 | 1 | 1 | 1 |
| nationalElections | 0 | 0 | 0 | 1 | 1 | 1 |
| officeStaffIncumbencies | 0 | 0 | 1 | 1 | 1 | 1 |

Empty from the opening to the last year (38): `campaignCommitments`, `causalProcesses`, `claims`, `dwellingOccupancies`, `dwellingOccupancyStates`, `dwellings`, `effectActivations`, `evidenceArtifacts`, `evidenceDiscoveries`, `housingTenureStates`, `housingTenures`, `incidentStates`, `incidentTransitionPlans`, `incidents`, `lifeLoadResolutions`, `metricObservations`, `metricStates`, `mortalityCheckPlans`, `mortalityCheckResults`, `perceptions`, `policyAlternatives`, `policyBaselines`, `policyEstimates`, `policyImplementationProfiles`, `policyOperations`, `policyRealizations`, `privateBeliefs`, `publicPositions`, `resourceFlowTerms`, `resourceFlows`, `resourceObligationStates`, `resourceObligations`, `resourcePositions`, `resourceTransferOutcomes`, `subjectKnowledge`, `temporaryStates`, `workItemStates`, `workItems`.

## How this was measured

```
npm run world:aging -- --years 5 --seed aging-1 --place 3918000 --max-minutes 120 --profile-years 1,5
```

- The world was opened the way the title screen's "Watch the world" opens one, in place 3918000, from seed `aging-1`. Opening took 4055 ms.
- A Day is one press of the observer clock's Day button: `advanceObservedWorld(world, 1)`, committed through the player root's stale-world guard. Median and p95 are over every press in that game year.
- CPU time counts every thread of the process, garbage collection included. Wall time also counts waiting for a processor.
- Save is `BrowserSaveStore.save` on the world at the end of the year: snapshot, content hash, serialization and the conditional write. Reopen is what Continue does in a new tab: the most recent save, then load, then the shell's viewpoint.
- Node has no IndexedDB, so the database under the save store is an in-memory stand-in that structured-clones values as a browser does. No disk time is included.
- Save size is the UTF-8 bytes of the stored world. Heap is V8's used heap after the year's save and reopen. Load average is the one-minute load when the year ended.
- Profiled years (1, 5) ran under V8's sampling profiler at 1 ms intervals, which adds a little to their Day times. Function lines come from the TypeScript source maps.
- Node v22.23.2. The whole run took 7.4 minutes of wall time.


## What was not run

- The 20-year run from the same seed was asked for and was not completed. This computer is shared with the game and other agents' work, and it was overloaded that night: a 20-year attempt ran 4 game years in 70 minutes before it was stopped. The same command with `--years 20` needs a dedicated or cloud machine.
- Year 5's Days cost 121 seconds of processor time in all, against 46 seconds in year 1. How the cost grows past year 5 is not measured.
