# Stand-in triage: justice (Nov 10, 2026)

Owner test (Nov 10): kept 1 (with what the player sees), dropped 0 (too in depth), of which borderline 0.

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                       | Still true? | What closes it | Pool item                                                                      | Size | May stay at early access?                                                                       | In plain words                                                                                                                                 | Where the player sees it                  |
| ------------------------------ | ----------- | -------------- | ------------------------------------------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| SG-JUSTICE-counted-custody-pay | still faked | code           | waits on the crime system (related open item gov-justice-counted-dispositions) | M    | yes: counted terms are head counts by group; picking a member without a record would be a roll. | People in the wider population who serve a jail or prison term keep their pay and their household keeps its income, unlike a named prisoner's. | Waits on the crime system (owner, Nov 10) |

## Evidence

- `SG-JUSTICE-counted-custody-pay`: src/core2/modules/justice.ts:1706-1735 (decideCountedCase writes CountedCustodyRow with personId "" and count; marker at 1729-1731); test src/core2/outcome-web-public-finance.test.ts:101 still expects the marker. Close by counts, at the group row, on the release calendar.

## Questions for the owner

None.
