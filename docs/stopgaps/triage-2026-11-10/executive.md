# Stand-in triage: executive (Nov 10, 2026)

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in | Still true? | What closes it | Pool item | Size | May stay at early access? | In plain words |
| --- | --- | --- | --- | --- | --- | --- |
| SG-EXECUTIVE-administrator-appoints | still faked | code | none | M | yes: county-administrator counties only; the board seat holder's reasons are a reasonable stand-in | In counties where a hired administrator picks department heads, the game has the board member pick them instead. |

## Evidence

- `SG-EXECUTIVE-administrator-appoints`: src/core2/modules/executive.ts:240-262 townAppointer returns the board seat holder for non-mayor/non-county-executive posts. Closing: make the administrator an appointee row read by traits; built when a post is filled, not daily.

## Questions for the owner

None.
