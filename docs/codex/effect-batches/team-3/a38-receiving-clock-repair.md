# A38 actual receiving failure — completed-shift caller repair

Portable patch: a38-receiving-clock-repair.patch.
SHA256: `40d7d27082e0790ee1631f1d5317b6b862c5c993abad4294ddede2e9838434d7`; 3,162 bytes.
Receiving tree supplied by coordinator: `080ac73f5781b6266caea6df2ac20690e9b083b3` (main3d99 + original 19-path patch + four-path closure + root PAY registration + unmodified three aa548 test donors).

## Observed failure and correction

Root terminal native receipt: 26 PASS / 1 FAIL of 27 in 84.91s, process 19478 exit1. Failure: earned-law-pay-payment.test.ts "A38 actual completed-shift payday delegates immutable earnings through the clock caller", "Completed shift pay must bind its saved work and earned terms." Root types process43708: 27 roots/1,144 files, five diagnostics confined to the two donor tests.

My earlier statement that base's existing completion caller was sufficient was incorrect. It established the call's presence, not compatibility with the independently guarded immutable-earned contract.

Exact base caller invoked raiseShiftPayToMinimum, passed its altered world and raised amount, while the shared writer independently selects the original terms at the actual completion frontier and requires the supplied completion amount to equal those terms. The legacy helper can append revised terms and uses the path's advertised minutes. Those actions bypass the saved assessment mechanism and contradict the unchanged test's contract-preservation assertions.

The repair reuses the already-published donor caller: pass original world and actual earned terms.amount with the same completion event, earned terms ID, work/flow activity ID, pay date and interval. The common writer remains sole law assessor/payment producer and derives lawful gross from saved completed minutes. No guard, immutable terms, law authority, transfer amount formula, schedule or other writer changes.

## Exact three-file patch bases

- src/simulation/life-paths2.ts — base `dd2172b309a05d6af2a4c8939ca009fa54985cf4` at exact main3d99. Only two caller statements change (+2/-3): remove the pre-common legacy raise call, pass world rather than raised.world and terms.amount rather than raised.terms. Current lazy handler/routine additions remain intact; no imports changed.
- src/simulation/earned-law-pay-payment.test.ts — unchanged donor base `a4a7868481fe84b7556757d186a875b4e6387d27` at aa548369984f66383cd87c37746ed99cdd5a28c5. Import actual exported lifePaths2Handlers and call its existing cached getter at the same advanceWorld call. All five cases and assertion bodies remain.
- src/simulation/earned-law-pay-integrity.test.ts — unchanged donor base `f4be98e236f56e2bfc1566553bc9f2f191577c7f` at the same donor. Two it.each callbacks explicitly type _name:string and change functions using the already-imported EarnedLawPayAssessmentRecord/WorkPayCoverageDeterminationRecord. Formatting only around those callbacks; no adversarial case, mutation or assertion changed.

## Ownership check and limits

Current main claims blob bfbe41f68464dfdb171e5f425a577b2e48b8cd6d retains Team 3's completed-shift payout adapter (claims line762). Current 00e had no later overlapping writer claim; the exact three-file claim was posted successfully before authoring. Audit JSON-import ownership is unaffected because production imports are untouched. Root retains registry, types, dispatch, resources and integrity; no foreign production hunk edited.

The now-uninvoked raiseShiftPayToMinimum definition is deliberately retained under this minimal caller repair. Full A38 old-helper/static-rule retirement is NOT claimed; request its next narrow retirement separately after this receiving result. A37/annual/other payroll paths are outside this delta.

## Actual verification

Executed in /tmp/team3-a38-receiving-clock-repair-080ac73:
- Exact baseline Git hash-object checks match all three blobs above.
- Native git apply --check exit0 for the final patch against those three baseline files.
- TypeScript parser syntax diagnostics zero for all three candidates.
- Prettier checks pass for all three candidates after formatting the typed integrity callbacks.
- The two test files preserve the same 90 expect-call expressions (72 payment +18 integrity) in the source comparison; no assertions/cases removed.
- Final SHA256/byte count verified. Shared registered checkout/index and parked bytes untouched.

NOT RUN here: renewed Vitest, semantic scoped types, ESLint, exact main/branch audit:scan, official Claude gate. Root's 26/27 failure and five donor-type diagnostics are predecessor evidence, not repaired-head PASS. Direct Git fetch still fails at the configured proxy; no parked-checkout or partial-tree scan substituted.

AUDIT: A38 NOT RUN/6 → NOT RUN/6, checks flipped: NOT RUN. Prerequisite unblocks the registered pay kind's actual completed-shift caller passing immutable earned terms into applyLawPayConsequence; full static scan and helper retirement remain open. No fabricated completion count.

Next: receiver applies this patch to its preserved candidate, reruns the same unchanged three-file native cases and scoped roots, and reports the exact composed source/result. Preserve the 26/27 predecessor and all actual gross/terms/employer-cash/stamp/reload assertions.
