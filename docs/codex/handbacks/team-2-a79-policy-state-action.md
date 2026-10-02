# Policy amendments now record each state's actual chamber votes

Before: a scheduled policy-amendment state action used a pooled majority and could borrow congressional people when the state's own body was absent.

After: it records the state's actual separate chamber roll calls, member reasons and explicitly classified ratification requirements. Under CTO12:12, all50state chambers have a binding: exact cited rules where admitted, or a disclosed ESTIMATE of a strict majority of elected members. Missing actual bodies still leave ratification pending, while the attempted due item resolves without scheduling a retry. The existing presidential term-limit caller uses the same recorder and retains its ballots and reasons.

## 1. Why-chain

A state approves only when every required chamber's recorded vote passes. Each chamber passes only when its actual member ballots meet its declared threshold and quorum; the saved provenance distinguishes sourced admission from ESTIMATE. Each ballot comes from the shared chamber decider and that person's existing considerations. Those considerations read the person's recorded principles or party relationship. The chain ends at a person's recorded reasons and a legal rule.

The old policy state-action branch ended at a pooled majority. Its fallback could count congressional people instead of the absent state body. This branch is removed. Separate application and convention callers still use `stateVoice` and `mostLeanYes`; this change does not claim to replace them.

## 2. Research

The recorder retains the existing October 1, 2026 federal-amendment ratification corpus and admission reader. That corpus cites state constitutions, chamber rules, statutes and legal opinions. It distinguishes elected members, present members and members voting, and records quorum, rounding and additional conditions.

CTO12:12 supersedes the original six-state admission limit. The existing corpus already contains50states and99chambers, including Nebraska's one legislature. Its single summary reference is CRS Report97-922, September30,1997: https://www.everycrsreport.com/reports/97-922.html. The historical survey is context, not proof that every chamber uses an elected-member denominator; no new web verification was performed.

Explicit ratification fractions retain their primary citations, including Alabama House3/5, Colorado House2/3 and Illinois3/5. Where the corpus does not establish an admitted ratification rule, the owner authorizes a strict majority of elected members as ESTIMATE. SourceTitle/citation/note disclose the estimate and verification is partial. Existing research quorum values remain separate and cited. For an explicit fraction with unimplemented conditions, the fraction stays intact but admission is marked ESTIMATE/partial; this does not claim the condition was enforced. Original research bytes and all conditions/extra floors remain unchanged in the corpus.

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

WORLD PIECES: the actual state body and current roster must exist. The disclosed ratification binding must cover every required chamber; source gaps do not fabricate people or a missing institution. Congress's presence does not substitute for a missing state institution.

CHECKS: each recorded state's approval equals every required chamber passing. All50states are now declared; D.C. and the five territories remain ineligible Article V states. Missing bodies still receive no fabricated action. New all-state binding and38-state actual-member proofs are published but NOT RUN; this is not a completed38-state ratification or browser-play proof.

## 6. Historical proof run and new NOT RUN limits

The receipts below apply to the original six-state head65a0f8b7d7cab347ef4cbc8f131b670f7f378fb6. They are not renewed results for the expanded binding.

The new38-state fixture supplies supportive political affiliations through the existing writer on actual President, Congress and state members; Congress and state ballots are never supplied. It requires37ratifications to remain pending and the38th to become operative, matches every saved member/body ID, checks sourced supermajorities and Nebraska's one chamber, and verifies Continue/repeat. It fails if the actual shared decisions do not pass. New native tests, scoped types, requested LOAD/app types, lint/format are NOT RUN: the builder environment failed to start. Claude checkers own official validation.



The complete changed scheduled-callback file passed 8 of 8 cases at stock limits. Its seed is `A79 policy amendment scheduled state action`. Five sampled admitted states were Maine, Arkansas, Delaware, Colorado and North Dakota. The fixture draws its home from all 56 starting jurisdictions; the home was not printed in the retained output. Congress's admission and the next-day calendar are explicitly authored to isolate the real state callback. State ballots remain unsupplied. The canonical due-item dispatcher performs the actual state action.

The complete changed term-limit preservation file passed 2 of 2 cases at stock limits. Its seed is `A79 saved term-limit state leaf parity`, home Delaware. Sampled states were Delaware, Alaska, Colorado, North Dakota and Maine. Across extend and restore, 1,098 member ballots and reasons matched the legacy oracle, with zero changes. Wrapper and shared-module records, sourced thresholds, Continue and repeat identity passed.

The first scheduled-callback run had five fixture failures and three passes: the test read status from the due-item definition instead of the separate saved due-item state history. The helper repaired only that accessor, retained the original log and reran the entire file. Initial sandbox startup failures before collection are also retained.

Builder receipts are not official gate results. Types, lint, report validation, release validation, unrelated tests and browser play were not run here. Claude checkers own official admission.

## 7. Worked example

In the Delaware House preservation fixture, Ibrahim Myers voted yea on extending the President's term limit and nay on restoring it. Both reasons were `member:presidents-party`. Alex Luna voted nay on extending it and yea on restoring it, with `member:other-party`. These were actual saved members with explicitly authored non-neutral affiliations, applied identically to the legacy oracle and shared caller. Their member identities, votes and reasons survived the recorded state action and Continue checks.

Method: production base `14e0668edd070615221c612a3c40ded4798f832a`. Scheduled-callback run: terminal session 1832, 14.87 seconds, `/tmp/team2-a79-state-action-test-repaired.log`. Term-limit run: terminal session 19993, 22.25 seconds, `/tmp/team2-a79-term-leaf-parity.log`. A guarded Node import of all three changed production modules exited zero. No timeout was increased, and no team merged this work.
