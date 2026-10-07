# State policy amendments now record the people in each chamber

Before: State policy amendment roll calls were filled from a whole-legislature share scaled to each chamber. The recorded seats named no people.

After: Each chamber records its own saved legislators' decisions through the shared member-vote engine. Missing bodies remain unsupported. Separate chambers can now reject a proposal that the old scaling would carry. This is a bounded policy-caller migration, with the filing preflight and governor term-limit caller still open.

## Why-chain

Measured source finding: the old recorder built unnamed seats and filled their votes from chamber counts (main e8b22a5f712a26bf72f86f028c0d1726682f2c1c, `src/simulation/living-world/constitutional-reform.ts:809`). The counts came from the legislature's combined yes share. That share dropped each person's chamber and seat identity. The recorder therefore assigned the combined result back to synthetic seats. Bedrock finding: stand-in arithmetic supplied an institutional act instead of recording the actual chamber's members.

Measured source finding: the policy recording branch now calls recordStatePolicyProposalVotes after saving the proposal (`src/simulation/living-world/constitutional-reform.ts:905`). The shared evaluator receives the actual saved body. No ordinary bill is manufactured for the constitutional question.

## Research

Measured source-contract finding: Audit supplied the saved state roster contract, naming active legislators, their seat work, dated institution bindings and the existing constitutional writer ([Audit contract in 00c](https://docs.google.com/document/d/1L5IksyT3b-NydhTq8Px3pVT4s8MxCZ9oAj-wqNm5AM4/edit)). Estimated seat counts cannot supply additional voters. The federal arm remains intact.

Measured source finding: this fixture uses the existing game-profile amendment rule, not sourced Oregon constitutional procedure (`src/simulation/constitutional-process.ts:141`). The patch preserves that label and adds no legal threshold, deadline, vote weight or empirical rate.

## Revisions

Measured source finding: stateConstitutionalRoster joins actual seat work to the saved office binding and organization profile (`src/simulation/governing/chamber-votes.ts:291`). Missing or inconsistent records refuse admission. Saved empty seats carry no replacement person.

Measured source finding: the ordinary policy review declines to substitute a congressional delegation when the state roster is unavailable (`src/simulation/living-world/constitutional-reform.ts:737`). Its existing policy-selection and filing preflight remain. That preflight still combines chambers; it is not claimed repaired here.

Measured source finding: the governor term-limit branch still uses its legacy synthetic roll call (`src/simulation/living-world/constitutional-reform.ts:909`). No state term-limit migration, convention change or ratification-engine change is claimed. The existing consideration builder is exported for reuse; its inputs and weights are unchanged.

## What gets built

1. Admit the actual saved state proposal through the existing constitutional member-vote context.
2. Resolve the state's pack, body, active seat tenures and dated institution binding.
3. Preserve recorded vacancies and present-not-voting instead of supplying a person or a yes/no answer.
4. Save each policy chamber's actual roll call with its source identities through the canonical constitutional writer.
5. Keep rejected proposals and preserve repeat behavior and Continue.
6. Refuse an unsupported state policy review without stopping the core clock.

## Simulated, records, world pieces, checks

Measured: the saved-state fixture names Haley O'Brien and Andrew Rice among 90 actual legislators (`src/simulation/governing/state-constitutional-vote.test.ts`). Its opposed principles and common-support views are authored test inputs. They are not simulated campaigning, natural filing or observed public persuasion.

Measured: the one-day core-clock case reaches the ordinary review handler, saves the proposal before both roll calls and records 90 actual voters (`/tmp/team2-a79-state-ready-native.log`). It reaches ratification, with no statewide ballot result claimed. This is not an ordinary-life year run.

Measured: the vacancy case ends an actual saved seat tenure through the canonical work writer (`src/simulation/governing/state-constitutional-vote.test.ts`). The roll call retains the seat as absent with null person identity. The constitutional history survives Continue.

## Proof run

Measured: the opposed-view comparison checks all 90 actual state members (`/tmp/team2-a79-state-ready-native.log`). No individual vote direction changes: two vote yea and 88 nay. The federal fixture separately compares 435 House and 100 Senate members with zero changed directions.

Measured: the chamber-disagreement fixture makes the larger chamber support the policy and the smaller chamber oppose it (`/tmp/team2-a79-state-ready-native.log`). The retained old whole-state arithmetic would carry in both chambers. The actual chamber roll calls reject the saved proposal. This intended institutional outcome correction requires CTO review.

Measured: all 14 focused cases passed in 49.17 seconds (`/tmp/team2-a79-state-ready-native.log`). Nine cover the state substrate and migration, and five cover the federal arm. All retained assertions and existing timeouts remain in force.

## Worked example

Measured: in Adair Village, Oregon, Haley O'Brien votes yea and Patrick Jackson votes nay when the authored views oppose one another (`/tmp/team2-a79-state-ready-native.log`). Their person and seat identities are retained. Andrew Rice and Cassandra Copeland likewise retain their Senate identities.

Measured: when the fixture makes the Senate oppose the policy, Andrew Rice's actual nay is recorded in the chamber that rejects it (`/tmp/team2-a79-state-ready-native.log`). The model's existing threshold decides the chamber result. No election, payment, enacted policy effect or legal research completion is inferred.

## Method and handoff

Audit gap A79. Runtime source d6bf6f28a15aeec6bcaba5b40bdc55c43bdb0fad is based on actual main e8b22a5f712a26bf72f86f028c0d1726682f2c1c. The fixture seed A79-saved-state-constitutional-body selects Adair Village from the eligible game-profile state pool, derived from all 56 starting jurisdiction identities. D.C. and territories are not given state constitutional authority by this test.

Four strict roots have zero diagnostics. Changed lint and format passed. Native and release checks passed. Spelling reports 21 inherited findings and none in these changed files. Zero-dice reports zero new findings and five inherited stale entries, exiting 1. Mechanical report check and Light review passed. Earlier attempts found a changed federal refusal message and fixture errors. Those setup failures and corrections are retained in a79-state-shared-vote-proof.json alongside the final receipts. The guarded native command uses one worker, unchanged timeouts and only the two affected constitutional vote test files.

Full suite, browser, statewide ratification, naturally formed policy views, ordinary-life year, speed and 56 populated-world proof were NOT RUN. Next: exact-head CTO review of this bounded state policy caller and the intended chamber-outcome correction. A79 filing preflight and governor term-limit callers remain separate unfinished work. A97 positive fulfillment still needs the approved receipt join; its negative guard is separately published on #1527.
