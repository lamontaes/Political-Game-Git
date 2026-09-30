# State and city wage laws retain their identity on pay records

Before: enacted state and city wage floors could raise recorded compensation without the law stamp that identifies their government. After: the existing compensation writer reads the governing law at that government's jurisdiction and saves its stamp. The existing payment writer carries that stamp to a recorded payment. This is the first owned patch in the consolidated labor and fiscal stamp batch. Controlled attribution checks passed; ordinary calendar payroll and a valid enacted-law world still need proof.

## 1. Why-chain

Measured source behavior in `src/simulation/living-world/town-pay.ts:930`: a compensation record changes because its amount is below the operative hourly floor multiplied by the role's recorded weekly hours and pay periods. The floor comes from the existing minimum-wage reader. A state floor belongs to the role's actual state; a city floor belongs to the role's recorded city. The stamp must identify the law that supplied that same floor. This chain ends at a legal rule and recorded work hours. The patch does not change worker choices, hiring, compliance or wage terms.

## 2. Research

No effect size, rate or empirical estimate is introduced. Existing floor terms and legal authority remain the reader's inputs. The controlled tests use authored laws and low prior pay to exercise attribution. Those inputs are test controls, not researched wage levels. Research and repairs of inherited estimated terms remain separate work.

## 3. Revisions

The patch selects the state or city proposition when that level supplies the binding floor. It resolves a state's identity from the role's recorded place. Missing state or city identity does not select a federal fallback. The existing federal and teacher writers remain preserved.

## 4. What gets built

1. Add state and city question selection within `raiseTownPayToMinimum` in `src/simulation/living-world/town-pay.ts`.
2. Resolve `lawInForce` at the setting's own jurisdiction and effective date.
3. Save the stamp only when its measure matches the actual floor setting's measure.
4. Exercise both levels in five predetermined places. Consolidate the remaining owned stamps in this branch rather than opening a separate law PR.

## 5. Simulated, records, world pieces, checks

Measured source change at `src/simulation/living-world/town-pay.ts:978`: compensation terms retain the work, flow and prior-term IDs. Measured source behavior at `src/simulation/resources.ts:627`: the shared resource writer preserves attribution on the payment record. Existing people, work relationships, recorded locations and legal settings are reused. No new simulation decision or financial transfer mechanism is added. When no governing law matches, no stamp is manufactured.

## 6. Proof run

Measured in `docs/codex/effect-batches/team-3/state-local-wage-checks.json:1`: 10 of 10 controlled attribution cases passed across Nevada, Minnesota, Washington, North Carolina and Florida. Both state and city attribution passed in each place. Five of five existing payment preservation and reopening cases also passed. The combined run completed in 23.05 seconds.

The state/city fixture deliberately supplies incomplete legislative history. It defers integrity validation only for the unit writer checks and asserts JSON persistence of the consequence record. It does not establish a valid enacted-law world, canonical world reopening, actual cash settlement or calendar payroll. Those checks are NOT RUN for these state/city fixtures. National firing remains unknown. Earlier malformed fixture failures remain in the durable logs.

## 7. Worked example

The controlled Nevada state case reads `us-policy-positions:labor-workforce.raise-minimum-wage` at the state jurisdiction. Its saved compensation stamp names that exact measure. Its recorded payment retains the same measure with `work-compensation-payment` and the source flow, terms and outcome IDs. This is a unit example; no named person's watched monthly story was collected.

## Method and next work

Base source: repaired compensation dependency `ab2a5e691f68a708dc9f49a8e2c8d7d651cfc83d`. The wage portion is limited to the state/local compensation stamp and its focused test. No resources, shared types, teacher floor or month/store bytes are changed. Continue the consolidated stamp batch and obtain the canonical Kind-B labor contract from Audit/Systems. Coordinator retains the shared tax writer.

Measured source addition in `src/simulation/state-income-tax-law.ts:56`: the state income-tax helper selects the same tax-year law as the operative schedule. It preserves the actual assessment source IDs. The shared assessment/payment integration remains a patch payload for the coordinator; no shared writer was edited. `docs/codex/effect-batches/team-3/consolidated-stamp-status.json:1` records 12 of 12 tax-reader checks and 10 of 10 wage unit checks passing in 21.95 seconds. Scoped strict checking found zero diagnostics across four roots. The payload passed an apply check against current main; runtime with the shared payload is NOT RUN. This helper is not an additional saved-effect writer.
