# Stand-in triage: officials (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 1 (too in depth), of which borderline 0.

Rows: 1. Still faked 0, already replaced 0, partly replaced 1, could not tell 0. Closes by: code 0, research 1, data 0, design 0, owner call 0. New items: 0.

| Stand-in                      | Still true?     | What closes it | Pool item                                    | Size | May stay at early access?                                                                                                      | In plain words                                                                                                                                                        | Where the player sees it              |
| ----------------------------- | --------------- | -------------- | -------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-OFFICIALS-unrecorded-party | partly replaced | research       | none (dropped: too in depth (owner, Nov 10)) | S    | yes: the remaining seats are few and the fallback is a marked estimate (partySource says it is estimated from the 2024 result) | A few officials whose party no roster gives (some vacant seats and territory boards) are placed in the party that carried their state in 2024, marked as an estimate. | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-OFFICIALS-unrecorded-party`: src/core2/modules/officials.ts:434-490 (unrecordedParty reads researchedHolderParty and the governor's ticket first, then the roster, then falls back to the 2024 state lean at line 486-490); data/research/offices/unrecorded-holder-parties-2026.json exists. gov-offices-roster-district-name-mismatch is done; gov-stopgap-officials-assumed-data is dropped.

## Questions for the owner

None.
