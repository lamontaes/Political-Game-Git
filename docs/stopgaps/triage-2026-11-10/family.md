# Stand-in triage: family (Nov 10, 2026)

Rows: 2. Still faked 2, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 0, research 0, data 0, design 2, owner call 0. New items: 0.

| Stand-in                         | Still true? | What closes it | Pool item | Size | May stay at early access?                                                                                                     | In plain words                                                                                                         |
| -------------------------------- | ----------- | -------------- | --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| SG-FAMILY-child-benefit-not-paid | still faked | design         | none      | L    | yes: the link is registered unwired in src/core2/data/outcome-web/unwired.json; no bill pays it so it moves nothing, honestly | No law in the game pays families a benefit for each child, so a child benefit's effect on child poverty cannot happen. |
| SG-FAMILY-birth-bonus-not-paid   | still faked | design         | none      | L    | yes: registered unwired (outcome-web/unwired.json:176); no bill pays a birth bonus                                            | No law in the game pays a household a bonus when a baby is born, so a baby bonus cannot change births.                 |

## Evidence

- `SG-FAMILY-child-benefit-not-paid`: src/core2/law-reach/group-b-money.ts:682-700 assistanceIncomeByHousehold reads only the welfare line's per-household assistance; src/core2/data/outcome-web/unwired.json:92. Closing as a monthly payment by child count.
- `SG-FAMILY-birth-bonus-not-paid`: src/core2/births-plan.ts:227 web factor read without any bonus input; src/core2/data/outcome-web/unwired.json:176. Closing: payment on the birth event, no scan.

## Questions for the owner

None.
