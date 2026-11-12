# Stand-in triage: living (Nov 10, 2026)

Owner test (Nov 10): kept 0 (with what the player sees), dropped 1 (too in depth), of which borderline 0.

Rows: 1. Still faked 1, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 1, research 0, data 0, design 0, owner call 0. New items: 0.

| Stand-in                      | Still true? | What closes it | Pool item                                    | Size | May stay at early access?                                                                             | In plain words                                                                                                                                             | Where the player sees it              |
| ----------------------------- | ----------- | -------------- | -------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| SG-LIVING-keep-back-gross-pay | still faked | code           | none (dropped: too in depth (owner, Nov 10)) | S    | yes: it errs one way by a known amount (withholding share) and withholdingFor exists to net it later. | When a household sets money aside for its next rent or mortgage, it counts members' pay before taxes, so a tight household keeps back a little too little. | dropped: too in depth (owner, Nov 10) |

## Evidence

- `SG-LIVING-keep-back-gross-pay`: src/core2/cost-of-living.ts:257-275 (housingKeptBack uses dailyPayMinor times days; comment/marker at 269); callers at cost-of-living.ts:333 and medical-bills.ts:605. withholdingFor in src/core2/tax-withholding.ts is not applied there. Cheap: one subtraction per household on its living day.

## Questions for the owner

None.
