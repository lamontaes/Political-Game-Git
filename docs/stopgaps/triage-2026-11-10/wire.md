# Stand-in triage: wire (Nov 10, 2026)

Owner test (Nov 10): kept 1 (with what the player sees), dropped 0 (too in depth), of which borderline 0.

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                   | Still true? | What closes it | Pool item                                                          | Size | May stay at early access?                                                                            | In plain words                                                                      | Where the player sees it                          |
| -------------------------- | ----------- | -------------- | ------------------------------------------------------------------ | ---- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| SG-WIRE-PEOPLE-SCHOOLMATES | still faked | code           | people-no-shared-school-or-work-between-people-at-the-start (open) | L    | no: a new player knowing no schoolmates breaks believable starts; needs the pre-start schooling pass | A new player starts knowing family, household and coworkers but no one from school. | Meeting people at the start: who he already knows |

## Evidence

- `SG-WIRE-PEOPLE-SCHOOLMATES`: src/core2/state.ts:269-277 openOpeningPeerTies calls api.stopgap(SCHOOLMATES_STOPGAP) and meets only workgroup; marker at 277. Pool item wire-people-and-director is dropped; the live item covers schoolmates. Close by monthly or on-open meeting through school records.

## Questions for the owner

None.
