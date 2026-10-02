# A13 / A38 core rationale and existing test donors

Portable payload head: `a6037fd14c56f621e8fec0739266e4e36c8d93fd`.
Exact receiving base: `3b7f5c0b07d9bbe1f63ef18d82e558a243d63045`.
Patch blob: `f7447e87e925edfc8ae9f6e8aeb001897845ab14`.
Coordinator reports SHA256 `178783b91ef580037c3b26b2814d84c6b5949695d2a65c2c400aa676c54cdad5` and isolated-index `git apply --cached --check` exit 0. Team 3 did not execute that native check. No semantic/test acceptance follows from apply-check.

The full 19-path/base-blob manifest is in a13-pay-admission.md. No production bytes or registry slot were changed by the artifact commit.

## Shared-core hunk rationale

| Proposed boundary | Why it is required for the existing exported hourly registration | Invariant retained |
| --- | --- | --- |
| law-consequence-types.ts completedShift context/base and saved-hourly result arm | Existing resolver must receive validated completion event and immutable terms IDs and return the existing saved-rule authority arm. | No new engine; current tax attributes and ordinary hourly arm retained. |
| types.ts optional coverage history and EntityKind; world.ts optional-history enumeration/shared-ID validation calls | Reused coverage query/validator must see existing records and saved assessment/coverage IDs must share global integrity checks. | Old saves with absent optional arrays remain supported; no coverage producer/opening hook copied. |
| office-pay.ts paidOfficeOf historical cutoff | Shared predicate must classify the actual role at earned-work time rather than a later appointment. | No salary, employer, occupation or jurisdiction inferred. |
| enacted-rule-changes.ts cutoff propagation | Saved hourly authority must use the actual earned frontier and retain exact clause/enactment lineage. | Current main operativeDateForEnactment and constitutional authority logic preserved. |
| minimum-wage.ts state reader cutoff and canonical numeric term | Pay resolver's auxiliary state setting must use the same dated/sequence frontier, not current cache or undated research level. | Root federal/local/fallback logic unchanged; no new rate/table/tier selection. Root reader review required. |
| law-effect-stamp.ts explicit ruleAuthority | Real saved-hourly rule has a clause/enactment but no fabricated policy question. | Null question allowed only with explicit validated pay rule authority; existing question and standing-service paths remain. |
| resources.ts + resource-integrity.ts assessment join | Higher lawful earned gross intentionally leaves immutable contractual terms unchanged; write/reload must independently validate its saved assessment, completion, lineage and amount. | Caller cannot supply a larger amount; ordinary equality, chronology, duplicate-period and cash guards remain. |
| enacted-law-effects.ts saved-hourly arm | Existing pay registration's saved-rule resolver must be applied through the same dispatcher and sole town-pay writer. | Main typed-tax and standing-service branches preserved. |
| policy-pack-registry.ts data-only wage rows | Default production catalog must carry existing qualified wage rows; handler presence alone is not admission. | Data-only import, current service/coverage/tax rows and IDs retained; no law-consequence-registry.ts write. |

The town-pay changes reuse the sole applyLawPayConsequence and completedPayShift validation. The published query/predicate/gross/integrity modules are reused rather than creating second readers, calculators or writers. A37 monthly accounting, annual-office action, starting-law data, hire/opening producers and legacy-floor retirement are deliberately excluded. The packet is the closure for published hourly/saved-hourly/completed-shift capabilities, not proof of the smallest theoretically possible registration.

## Exact existing test source pins

All verified files below exist at donor `aa548369984f66383cd87c37746ed99cdd5a28c5`; these are source donors, not executed receiving-head receipts.

| File | Exact blob | What it tests / receiving caveat |
| --- | --- | --- |
| src/simulation/completed-hourly-gross.test.ts | 3aa4c9fa37553bcfae667c4d0ad0099b8ecb0293 | Three pure formula cases: stronger contract, actual partial-hour minutes/final rounding, invalid inputs. Directly targets the new leaf. |
| src/simulation/earned-law-pay-payment.test.ts | a4a7868481fe84b7556757d186a875b4e6387d27 | Five actual producer/payment cases: assessment without money, higher completed interval gross, actual completed-shift clock caller, default saved-hourly weekly dispatch, weekly authority/withholding. Assertions retained. Requires catalog setup prerequisite below. |
| src/simulation/earned-law-pay-integrity.test.ts | f4be98e236f56e2bfc1566553bc9f2f191577c7f | Independently validates completion/gross/lineage, malformed/duplicate/old-save inputs, and forged coverage authority. Coverage adversarial cases require actual saved producer records below. |
| src/simulation/law-effect-stamp.test.ts | ff86d687a4413fe21fa99ea9391b494362b889ca | Existing question/starting-law and explicit questionless rule/standing-service stamp contracts; this is a donor for a changed core helper, not annual pay-writer admission. |

### Exact unresolved test prerequisites

1. Payment donor line 100 passes `policyCatalog: catalog` into createScenarioWorld before jobs are created. Exact base demo.ts blob `ca693f572ae10871837a4d63ddd212bcae998ff7` has no policyCatalog option/forwarding. This donor therefore needs the prior optional catalog-forwarding fixture seam from its donor, reviewed by its current owner, or an already-supported equivalent setup that establishes the same production catalog before actual work is created. Do not swap the catalog after creating jobs/coverage and do not change the five assertion bodies. Demo production seam is outside this payload; no ownership implied.

2. Integrity donor lines 475–486 explicitly require `workPayCoverageAt(...)` to return an actual determination and federal exception row. This packet contains only the released query/guard/type, not determine/initialize/hire/opening producer hooks. Its coverage adversarial cases cannot be claimed as supported merely from the query's presence. Receive an actual admitted producer/hire-opening path separately if these cases are required; do not synthesize canonical coverage in the fixture or weaken assertions.

3. Exact base life-paths2.ts blob `dd2172b309a05d6af2a4c8939ca009fa54985cf4` already calls settleTownCompensations with completedShift at lines 1098–1109. No completion caller delta is included or needed merely to make that call exist. Actual receiving runtime remains untested.

4. Donor resource-law-stamps.test.ts blob `68e1c1244d887f65511eac0b5a2be3d168f85eda` still asserts legacy `work-compensation-payment` at line 102. It is NOT offered unchanged as acceptance for this packet's canonical `pay` propagation; preserve it as an identified stale-contract issue rather than reporting it as passing.

No pay.test.ts/pay-default-registry.test.ts exists at the donor paths searched in src/simulation or law-consequences. Do not cite their historical receipts as this source's default-registry proof. The payment donor's two actual weekly/default-dispatch cases are available at lines 700 and 750 after the setup prerequisite; coordinator still owns default registry admission and its current-contract checks.

## Check distinction and next step

Executed by Team 3: GitHub source/blob verification, exact remote patch/handoff comparison and 19-file mechanical diff reconstruction. Executed by coordinator: exact-base isolated-index apply check, per received report. Native tests/types in this session: NOT RUN; executor configuration failure remains.

Coordinator receives/reviews the proposed shared hunks and sole pay slot, with Claude performing actual changed-file gates. Preserve AS/NY/OR unresolved scope and starting-term failures, without hardcoded fallback or general all-56 numeric applicability. Team 3 retains A38 retirement then A37; playtest work remains parked.
