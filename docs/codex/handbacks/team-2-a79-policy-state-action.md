# Policy amendments now record each state's actual chamber votes

Before: a scheduled policy-amendment state action used a pooled majority and could borrow congressional people when the state's own body was absent.

After: it records the state's actual separate chamber roll calls, member reasons and sourced ratification requirements. Missing bodies or unsupported rules leave ratification pending, while the attempted due item resolves without scheduling a retry. The existing presidential term-limit caller uses the same recorder and retains its ballots and reasons.

## 1. Why-chain

A state approves only when every required chamber's recorded vote passes. Each chamber passes only when its actual member ballots meet its sourced threshold and quorum. Each ballot comes from the shared chamber decider and that person's existing considerations. Those considerations read the person's recorded principles or party relationship. The chain ends at a person's recorded reasons and a legal rule.

The old policy state-action branch ended at a pooled majority. Its fallback could count congressional people instead of the absent state body. This branch is removed. Separate application and convention callers still use `stateVoice` and `mostLeanYes`; this change does not claim to replace them.

## 2. Research

The recorder retains the existing October 1, 2026 federal-amendment ratification corpus and admission reader. That corpus cites state constitutions, chamber rules, statutes and legal opinions. It distinguishes elected members, present members and members voting, and records quorum, rounding and additional conditions.

Admission still requires explicit ratification rules whose conditions the existing reader supports. An ordinary-question inference is not permission. The six admitted states are Alaska, Arkansas, Colorado, Delaware, Maine and North Dakota. No threshold, fraction, quorum, condition or citation changes here.

## 3. Revisions

The existing actual-state member helper and recorder move into a shared module. A callback supplies the caller's existing per-member considerations. Existing public term-limit APIs remain wrappers. They read their saved amendment and holder once per call, then evaluate each actual member against the current world.

The policy caller supplies its existing policy considerations. It no longer records approval from a pooled majority. The extraction avoids adding a direct Article V to federal-reform import edge, because federal-reform already imports Article V's consideration builder. There is no new evaluator, saved schema, threshold or draw.

## 4. What gets built

1. Move the existing two actual-state functions into `governing/constitutional-state-votes.ts` with an explicit consideration callback.
2. Preserve the existing federal-reform exports and their policy or presidential-term-limit consideration selection.
3. Replace the scheduled policy state-action branch with that recorder. Missing admission returns a pending explanation without a fabricated state action. The due item resolves; this patch does not add an automatic retry.
4. Test the ordinary due-item dispatcher, separate chamber identities, reasons, unsupported jurisdictions, missing bodies, controlled-member absence, Continue and repeat.
5. Compare both term-limit directions with the existing legacy ballot oracle on the same actual people and proposal inputs.

## 5. Simulated, records, world pieces, checks

SIMULATED: actual state members decide through `decideChamberVote`, using the caller's existing personal considerations. A controlled member without an authored ballot remains absent.

RECORDS: existing constitutional action and chamber vote writers save the actual measure, jurisdiction, organization, member identities, reasons, thresholds and source IDs. A repeated action returns the same world. Canonical serialization preserves those records.

WORLD PIECES: the actual state body and current roster must exist. The existing researched ratification admission must support every required chamber. Congress's presence does not substitute for a missing state institution.

CHECKS: each recorded state's approval equals every required chamber passing. The 44 other states remain unsupported by this narrow admission reader; D.C. and the five territories are ineligible Article V states. No unsupported jurisdiction receives a fabricated state action. This is not a completed 38-state ratification or browser-play proof.

## 6. Proof run

The complete changed scheduled-callback file passed 8 of 8 cases at stock limits. Its seed is `A79 policy amendment scheduled state action`. Five sampled admitted states were Maine, Arkansas, Delaware, Colorado and North Dakota. The fixture draws its home from all 56 starting jurisdictions; the home was not printed in the retained output. Congress's admission and the next-day calendar are explicitly authored to isolate the real state callback. State ballots remain unsupplied. The canonical due-item dispatcher performs the actual state action.

The complete changed term-limit preservation file passed 2 of 2 cases at stock limits. Its seed is `A79 saved term-limit state leaf parity`, home Delaware. Sampled states were Delaware, Alaska, Colorado, North Dakota and Maine. Across extend and restore, 1,098 member ballots and reasons matched the legacy oracle, with zero changes. Wrapper and shared-module records, sourced thresholds, Continue and repeat identity passed.

The first scheduled-callback run had five fixture failures and three passes: the test read status from the due-item definition instead of the separate saved due-item state history. The helper repaired only that accessor, retained the original log and reran the entire file. Initial sandbox startup failures before collection are also retained.

Builder receipts are not official gate results. Types, lint, report validation, release validation, unrelated tests and browser play were not run here. Claude checkers own official admission.

## 7. Worked example

In the Delaware House preservation fixture, Ibrahim Myers voted yea on extending the President's term limit and nay on restoring it. Both reasons were `member:presidents-party`. Alex Luna voted nay on extending it and yea on restoring it, with `member:other-party`. These were actual saved members with explicitly authored non-neutral affiliations, applied identically to the legacy oracle and shared caller. Their member identities, votes and reasons survived the recorded state action and Continue checks.

Method: production base `14e0668edd070615221c612a3c40ded4798f832a`. Scheduled-callback run: terminal session 1832, 14.87 seconds, `/tmp/team2-a79-state-action-test-repaired.log`. Term-limit run: terminal session 19993, 22.25 seconds, `/tmp/team2-a79-term-leaf-parity.log`. A guarded Node import of all three changed production modules exited zero. No timeout was increased, and no team merged this work.
