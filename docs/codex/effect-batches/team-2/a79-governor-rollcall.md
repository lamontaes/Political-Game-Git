# Governor term-limit votes now name the actual legislators

Before: A governor term-limit proposal recorded anonymous seats, scaled from a whole-state vote share. The saved rollcall could disagree with the actual chamber members.

After: Each saved chamber records its actual members and their decisions through the shared vote function. Individual votes and existing term-limit reasons stay the same. Missing saved bodies remain unsupported. The older filing preflight remains a separate unfinished caller.

## Why-chain

Measured source finding: the old writer converted a statewide count into anonymous chamber seats (`constitutional-reform.ts` before this patch, line 927). It used each chamber's size but discarded which members belonged to it. That lost the chamber's actual party and relationship inputs. The new writer keeps those identities. Bedrock: each saved person's decision, rather than an assigned seat tally.

Measured source finding: the survivor is decideChamberVote, using the existing actual state-member context (`constitutional-reform.ts:886`). The canonical constitutional writer applies the proposal's unchanged threshold. No second evaluator, vote-weight table, new draw or constitutional schema was added.

## Research

Measured contract finding: the prior state-body contract requires the actual saved proposal, chamber, seat tenure and dated institution binding (`chamber-votes.ts:237`). This extension reuses that contract. Connecticut's selected proposal profile is marked game-profile; this report does not present it as researched Connecticut law.

Measured source finding: the term-limit consideration builder retains its existing party, relationship and constitutional-bar inputs (`federal-reform.ts:425`). Existing cause terms, applicability, election scheduling and statewide-view limits remain intact. This patch adds no research estimate or mechanism.

## Revisions

Measured source finding: the governor caller validates its saved rule-field proposal, actual current officeholder and matching term values (`constitutional-reform.ts:825`). The existing policy caller and governor caller now share the same recorded state-rollcall orchestration. The governor's actual term ID accompanies the actual body and proposal source IDs.

Measured scope limit: filing still calls the legacy term-limit ballot and scales its preflight totals (`constitutional-reform.ts:729`). That preflight does not write the new rollcall. The broader federal migration remains its separate published candidate; this branch only extracts the existing consideration builder needed here.

## What gets built

1. Export the existing term-limit consideration builder without changing its inputs or weights.
2. Resolve the saved governor proposal and actual holder before deciding.
3. Reuse actual state chambers and the shared member-vote function.
4. Replace anonymous scaled rollcalls with canonical recorded member decisions.
5. Refuse absent state-body bindings and preserve repeat, player absence and Continue behavior.

## Simulated, records, world pieces, checks

Measured: the identity pool contains all 56 jurisdictions; the fixture selects from 49 admitted modeled state-amendment profiles (`governor-constitutional-vote.test.ts:34`). Its seed selects Ansonia, Connecticut. The canonical opening writers provide a governor and 187 actual legislators: 151 House members and 36 senators. The proposal and its direction are supplied test inputs, not a naturally filed amendment.

Measured: Jordan Murray votes yea on restoration because of member:other-party (`/tmp/team2-a79-governor-ready.log`). The actual House restoration tally is 53 yea; the old projection would report 52. The House rejects the supplied proposal. That rejection and its 151 named dispositions survive canonical Continue and repeat unchanged.

## Proof run

Measured: all 14 cases passed in 40.99 seconds (`/tmp/team2-a79-governor-ready.log`). Five cover this governor caller; nine preserve the existing state policy caller. All 374 individual extension/restoration ballot and reason comparisons match the legacy evaluator. This is fixture-scoped parity.

Measured intended differences: the actual extension tallies are House 98 and Senate 24; the old scaled tallies are 99 and 23 (`/tmp/team2-a79-governor-ready.log`). Restoration tallies are 53 and 12, versus projected 52 and 13. No individual vote changed. The intended change is whose actual votes comprise each chamber, including their IDs and reasons. No new overall pass-versus-reject reversal is claimed for this governor fixture.

Measured: missing institution bindings, mismatched terms and an unrecorded holder are refused (`governor-constitutional-vote.test.ts:325`). An actual controlled member remains absent. Terms and applicability are unchanged. Natural amendment filing, statewide ratification, all-56 populated worlds, full suite and year-speed were NOT RUN.

## Worked example

Measured: the supplied restoration amendment has identity constitutional-measure_65419a77520164dc (`/tmp/team2-a79-governor-ready.log`). Its House vote records Jordan Murray's actual seat and person. It no longer substitutes a nameless seat with a ballot assigned from the statewide ratio. A failed chamber vote leaves the proposal rejected with its rollcall saved.

## Method and handoff

Audit gap A79. Runtime source 5bf0c950d19aab23fd4f8d8aec2aab6da7deb457 is composed with main 1bcc9a6cbb8024cae4135a55f01aa069942994b5 and the unchanged published state-context candidate. The predecessor state-context PR remains separate and requires review. No merge acceptance is claimed.

Four strict source/test roots have zero diagnostics. Changed lint, format, whitespace and release checks pass. Zero-dice reports zero new findings and five stale entries, exiting 1. Spelling reports 23 existing findings and none in this batch's new prose. Evidence and historical failed attempts are preserved in the companion proof artifact.

An initial run passed 13 cases and failed a fixture assertion against the wrong canonical vote field. A later 14-case run passed. The final run adds an explicit counterexample to the old chamber projection. A subsequent type-only annotation repair changed no executed behavior. Tests used one process, one worker and unchanged timeouts. Next: exact-head CTO review; migrate the remaining filing preflight separately without changing weights or manufacturing a proposal identity.
