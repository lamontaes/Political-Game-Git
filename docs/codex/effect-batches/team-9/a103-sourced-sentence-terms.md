# Judges choose a sentence from the applicable legal range

A judge now chooses a legal sentence from the case's recorded facts and the applicable sentencing range. A mandatory minimum raises the lowest available term. The previous fixed midpoint is removed. Life imprisonment remains life, with no invented release date. Missing legal grades, probation durations, or a conflicting floor leave the sentence pending. This is a draft for review; broader sentencing coverage still needs legal source work.

## Acceptance and observed behavior

MERGED: None of this candidate.

WHAT EMERGED: DECIDED — Anika Terry's guilty-plea cases recorded “Use the least term sufficient within the recorded legal range. They accepted responsibility through the saved guilty plea.” California produced 24 months; the four other sampled places produced zero months. A second Massachusetts conviction recorded “Their case records contain earlier convictions.” Its chosen maximum was life imprisonment. HARDWIRED — authored decision importance is declared in `sentencing-term.ts:94`; these are design choices, not measured judicial behavior.

VITAL STATISTICS: Five sampled places, one additional actual-prior life case, and all 56 base-robbery range lookups. Zero months means no time held after that sentence. These fixtures do not measure a national incarceration rate.

## 1. Why-chain

A sentence exists because the actual seated judge selects an available legal option. That option is available because the saved case's state and recorded offense facts match a researched row. The operative mandatory minimum raises the bottom of that row. Recorded convictions, findings, a guilty plea, and the judge's existing principles affect the choice through the existing decision engine. The chain ends at the legal range and the person's recorded decision. It does not end at a midpoint or a random outcome.

A missing grade cannot become a weapon or dwelling allegation. A missing seated judge stays pending through the existing court guard. A missing probation duration does not become a guessed sentence. The reader preserves source versus estimated labels and their contributor provenance.

## 2. Research

The consumer reads the existing 56-place sentencing packet from the X5 research publication. Its reported coverage is 46 sourced places and 10 labeled ESTIMATED FROM AVERAGE places. These are bounds, not a claim that every case qualifies for every listed row.

The base robbery rows can apply when weapon and injury enhancements are not alleged. The other packet rows require an exact recorded grade and their admitted predicates. Grid rows with prior convictions remain unsupported without a recidivist cell. Fractional month conversions remain unsupported because rounded research months cannot establish an exact calendar release date.

No new sentence range, legal citation, or empirical decision weight is invented here. The weights for parsimony, plea, priors, findings and presumptive terms are authored design choices under the CTO's judge-choice ruling.

## 3. Revisions

The previous midpoint and sentence-month helpers are removed. One bounds reader combines the applicable statutory range and operative law floor. If the floor exceeds the finite statutory ceiling, the case remains pending for an explicit legal rule. Repeal removes the operative floor; it does not remove the researched range or rewrite a historical sentence.

Life uses an explicit saved life tag. Sentence readers expose no fixed end date, jail continues to hold the person, and the legal record says life imprisonment. Actual clemency can still end the sentence. Existing finite sentence records continue to read normally.

## 4. What gets built

1. Save one versioned applicability snapshot on the actual referral, using existing event tags and actual case-basis references.
2. Carry that snapshot and actual prior conviction IDs into the existing court case.
3. Resolve the admissible researched range and combine it with the operative minimum.
4. Let the actual judge choose minimum, sourced presumptive term when present, or maximum through the existing decision engine.
5. Save the term, range, citation, source or estimate provenance, and decision identity through the existing sentence writer.
6. Preserve life in custody, clemency, absence, legal-record and campaign-message readers.
7. Keep unsupported bindings pending and identify their exact missing source or producer.

## 5. Simulated, records, world pieces, checks

SIMULATED: the actual seated judge chooses from legal options with randomness disabled. RECORDS: referral allegations, prior convictions, the sentence and decision trace carry provenance. WORLD PIECES: the existing court, seat tenure, defendant, judge and operative-law reader supply the actors and law. CHECKS: bounds, grade refusal, actual saved actors, life without a fabricated end date, repeat and canonical save/reload.

The new allegation input is available to the existing referral writer. Legacy incident producers do not yet supply every weapon, injury, dwelling or damage fact. Their absent facts remain not alleged. No civil case schema or new court is created.

## 6. Proof run

The logged seed `team9-a100-saved-court-finder-20261001` selects North Dakota, Massachusetts, Hawaii, Iowa and California. Controlled cases use Anika Terry, the actual saved venue, the actual dated judge and original due-stage records. These are bounded native writer fixtures, not a national played-year report.

The retained earlier receipts include the initial fixture API failure, the duplicate provenance-tag failures, seven passing corrected cases, and the life run's three clemency failures. Those clemency failures correctly refused petitions after zero-month terms were already served. The fixture now takes the actual contested-trial path while retaining every original clemency assertion and time limit. The preceding source passed all 13 sentence and clemency cases.

The renewal on `8d34d240` passed all 13 native sentence and clemency cases in 222.07 seconds. The next source, `f58ce2b5`, tightened the injury guard and passed 57 selected reader and floor/repeal checks in 61.49 seconds. Twenty-two other cases were deliberately skipped. Strict types checked 1,568 files from 12 roots with zero diagnostics. These source-bound results and every retained failure are recorded in the proof manifest. A native bill-enactment-plus-range proof remains outstanding. Full-suite, year, browser, nationwide firing and final-main acceptance are NOT RUN.

## 7. Worked example

In the controlled California case, Anika Terry's saved guilty plea reaches sentencing on July 4, 2026. The applicable minimum is 24 months. The judge selects that option, and the saved sentence ends on July 4, 2028. The same controlled offense in North Dakota reaches its lawful zero-month minimum and is already served that day.

In a separate Massachusetts case, Anika's second referral carries the first case's actual saved conviction. The judge selects the maximum option, life. The saved term has no month count or fixed end date. A later custody query and the assembled legal record retain that life sentence. Canonical reload and repeat do not create a second sentence.

## Source, ownership and remaining work

The branch is additive to current main `98e1c61b6bcfdcad104032ae1ed6ed8f6fc86aa8` and preserves A10 #1574 and A100 #1598. It includes only the coordinator's released saved-stage hook from `912450fd0542b7d686dbc499ae0a6cd8c6fe3f67`; modern sentencing and clemency writers are preserved.

Team9 owns the justice consumer and handler edits. The explicit shared presentation grant covers only legal-record termLine/servingNow and campaign-projection's jailed-until message. Team7's county qualification and timing hunks are preserved. Both unrelated intake files remain untracked and preserved.

Missing inputs are unenhanced assault/burglary grades, probation durations, exact day units, recidivist grid cells, the floor-above-ceiling legal rule, and an actual fact-change recovery trigger. The Audit dependency is the modern native enacted-law fixture. These gaps prevent full A103 closure.

The current autoscan still looks for the floor call directly in prosecution.ts. The sole floor-plus-range query now lives in sentencing-term.ts and is called by the actual sentence writer. That shared scan rule and the old research-data allowlist entry need their owner’s update; this branch does not change shared audit rules. The requested historical justice/jail-absence.test.ts path did not exist and was NOT RUN. The assembled legal-record life text is asserted; browser interaction and the campaign viewport are NOT RUN.
