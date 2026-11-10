# Stand-in triage: office (Nov 10, 2026)

Rows: 3. Still faked 2, already replaced 0, partly replaced 1, could not tell 0. Closes by: code 3, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                             | Still true?     | What closes it | Pool item                                                  | Size | May stay at early access?                                                                                                                             | In plain words                                                                                                                                                    |
| ------------------------------------ | --------------- | -------------- | ---------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SG-OFFICE-FED-trip-residents         | partly replaced | code           | office-stopgap-office-day-federal-president-missing-record | M    | yes: federal travel to other towns is coarser at early access; the met person's age, job and wage already match the place's counts, a marked estimate | A person the president meets in another town has an age, job and pay that match that town's counts, but no household, employer or paycheck exists for them there. |
| SG-OFFICE-FED-pardons                | still faked     | code           | nation-president-orders-by-series-part-4-pardons           | M    | yes: playing as president is not an early-access gate, and courts and federal prosecution come after early access                                     | The president has nobody to pardon, because the game does not yet record which government prosecuted a conviction.                                                |
| SG-OFFICE-public-project-finish-date | still faked     | code           | gov-m3-04-funded-work-delayed-or-failed                    | M    | yes: payments are real and the finish date is a marked estimate; no early-access path needs a late or failed work                                     | Every paid public work is finished on the day the next budget year starts, so none is ever late or abandoned.                                                     |

## Evidence

- `SG-OFFICE-FED-trip-residents`: src/core2/office-day-federal-president.ts:849-850 (travelToTown draws from coarsePlace(placeKey, seed) at line 845, stopgap still called); doc comment 820-830 says the job is a fact on the person only. Counts piece is world-trip-resident-from-place-counts (done). world-other-places-coarse-population is dropped (country-tier design replaces it). Cheap: filled in only when met.
- `SG-OFFICE-FED-pardons`: src/core2/office-day-federal-president.ts:985-988 (pardonable returns [] and calls api.stopgap); src/core2/modules/justice.ts records no prosecuting sovereign (grep sovereign: none). Item is open and waits on justice-federal-case-stream (open). Cheap: a lookup at the moment a president opens the pardon list.
- `SG-OFFICE-public-project-finish-date`: src/core2/modules/projects.ts:54-70 (finishedProjects finishes a paid award when budgets.find(fiscalYear+1).startsOn passes; api.stopgap at line 61). Item status open. Cheap: one schedule row per award, advanced monthly with the payment.

## Questions for the owner

None.
