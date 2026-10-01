# Rejected governor term-limit proposals keep their actual votes

Before: The term-limit filing gate discarded a cause-backed proposal when a scaled preliminary tally predicted defeat. No proposal or rollcall was saved.

After: The existing tenure cause produces a genuine proposal before the shared member vote. A rejected proposal keeps its actual legislators and reasons. Terms and chamber thresholds stay the same. General policy filing still uses its older preliminary tally and remains a separate unfinished caller.

## Why-chain

Measured source finding: reviewTermLimit previously predicted passage from a combined state vote share before saving a proposal (`constitutional-reform.ts:688`). That prediction could erase a real cause and its defeated proposal. The approved route saves the proposal first, then uses the existing shared rollcall writer. Bedrock: actual members decide from their recorded party and relationship inputs, with the existing constitutional-bar consideration.

## Research

Binding ordering: the CTO approved saving the term-limit proposal before decideChamberVote and retaining a rejected rollcall. The coordinator explicitly confirmed that ruling covers this state caller. This is an approved simulation ordering, not an empirical claim about Connecticut law.

Measured source limit: the existing cause still uses the disclosed constitutional reform profile (`constitutional-reform.ts:153`). Its tenure trigger, proposed limits and ballot lead are unchanged placeholders. This patch adds no researched rate, numerical calibration or new consideration weight.

## Revisions

Measured source change: the term-limit route no longer calls the private ballot or countLegislature before filing (`constitutional-reform.ts:743`). It retains actual-body admission, the cause's terms and applicability, and the existing canonical proposal writer. A rejected proposal is not scheduled for a voter ballot.

Measured remaining distinction: principlesAmendment and reviewBackground still use the scaled general-policy filing gate (`constitutional-reform.ts:536`). This checkpoint does not apply the term-limit ordering ruling to that separate policy-selection route. Its saved rollcall already uses actual members; its filing order remains unfinished.

## What gets built

1. Save the existing cause-backed governor term-limit proposal first.
2. Decide through the existing actual-state shared member context.
3. Keep a rejected proposal and its named rollcall.
4. Reuse the year's saved proposal on repeated review instead of creating a duplicate.
5. Preserve actual-body refusal, terms, applicability and chamber thresholds.

## Simulated, records, world pieces, checks

Measured: the existing seed selects Ansonia, Connecticut, from 49 admitted modeled state profiles within the full 56-jurisdiction pool (`governor-constitutional-vote.test.ts:53`). The opening provides an actual governor and 187 actual legislators. The fixture supplies two prior tenure events through the canonical writer, completing a three-term recorded cause. Those earlier terms did not emerge through natural elections.

Measured: the old arithmetic predicts no filing for those same people and cause (`governor-constitutional-vote.test.ts:250`). The new one-day review saves a genuine proposal, then records the actual House. The House rejects it after 151 named decisions. The Senate is not voted after that rejection; no Senate result is invented.

## Proof run

Measured: all 17 focused cases passed in 52.58 seconds (`/tmp/team2-a79-term-filing-final.log`). Six cover the governor caller, including the new cause-backed filing case. Eleven preserve the state-policy caller and body guards. Four strict roots have zero diagnostics. Individual extension/restoration parity retains all 374 existing ballot and reason matches.

Measured: the new filing case compares each recorded member ballot and reason with the retained old evaluator (`governor-constitutional-vote.test.ts:320`). Proposal sequence precedes its votes. Terms and the profile threshold are unchanged. The rejected proposal's IDs and rollcall survive canonical Continue and repeated review. No voter-ballot due item is added.

## Worked example

Measured: proposal constitutional-measure_fe5463ba463c3517 is rejected with its House rollcall saved (`/tmp/team2-a79-term-filing-final.log`). Jordan Murray, person_16b8603621962b70, votes yea because of member:other-party. The previous gate would have saved neither his vote nor this proposal. This is a change in saved filing evidence, not a change in Jordan's vote direction.

## Method and handoff

Audit gap A79. Executed source 8492fb4adc36f952188a6a622602444bbe103113 composes main 2b28298d55c8d5fd88af84b71a12196f31914aac. Branch codex/team2-a79-state-filing-preflight preserves the published state-context head efd8b60eb1f5ee116dbe0a5fc87017a666dca100 and governor head 6da7e1f69cab5fe380f3a4680269790656ef1e89. The PR contains these still-unmerged predecessor source dependencies; Team 2 changed neither published predecessor.

Changed lint, format, whitespace and release checks pass. Zero-dice reports zero new findings and five inherited stale entries, exiting 1. Full suite, year-speed, natural multiyear tenure, statewide ratification and all-56 populated worlds were NOT RUN. The general-policy preflight migration is NOT COMPLETE. Earlier fixture failures and exact checks remain in the companion proof artifact. Next: exact-head CTO review of this bounded term-limit route; resolve general-policy ordering separately.
