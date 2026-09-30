# Law arguments change the reason a lawmaker gives for a vote

Lawmakers now weigh a law's arguments by both the argument's importance and their own recorded conviction. The focused example changes a vote reason when opposing arguments have different weights. Older laws retain their previous behavior when no argument weight is supplied. This validates the decision reader, rather than a completed nationwide legislative vote.

## 1. Why-chain

A law argument can change a member's reason because the law decision reads the member's principle score. Why does that score change? It combines the directions of the law's arguments with the member's saved stances. Why does an argument contribute more or less? Its catalog weight multiplies the member's continuous principle strength. Why are those values used? One records the authored importance of that argument; the other belongs to the person. Why does the member hold that strength? The existing life-formation writer records it from the person's history. This change reads that record and does not rewrite it.

The terminal is a person's recorded stance and strength, combined with an explicitly authored argument weight. These weights are design choices, not measured political preferences. The existing score scale and importance thresholds remain authored stand-ins. Constituent requests, groups, news, party commitments and procedural considerations remain separate decision inputs; this change does not claim to cover them all.

## 2. Research

The coordinator's optional weight contract accepts finite values from zero through one. Omission means one for legacy data. The loader retains the raw pack's relation weight on the compiled bearing. This is an owner-authorized design contract, not a causal estimate. Each team's ideology payload supplies the argument's position grounding.

## 3. Revisions

Each argument's contribution is its direction times the person's continuous strength times the existing score scale times the catalog weight. A zero-weight argument contributes neither a score nor a supporting record reference. A missing weight preserves the previous contribution. No new draw, threshold or life-formation rule is introduced.

## 4. What gets built

1. Read `bearing.weight ?? 1` in the existing `principledLeaning` scoring loop.
2. Multiply it by the person's saved strength, preserving support and opposition.
3. Exercise the existing vote-reason and view readers with competing weighted arguments, reversed bill answers, zero weights and omitted weights.

Current main has no function named `officeholderPrincipleBias`. The actual filing and vote paths call `principledLeaning`. The raw pack relation is consumed by the coordinator-owned loader, rather than a separate officeholder raw-pack decision reader. Shared schemas and catalog edits belong to the coordinator.

## 5. Simulated, records, world pieces, checks

The existing decision reader combines a person's recorded principles with the law's catalog bearings. It returns a reason for or against the bill; the broader vote machinery decides the vote. Principle records and catalog weights are inputs. The reader writes no history. Missing principles, conflicted stances and all-zero contributions give no invented principle view.

The coordinator's schema and loader contract is the required world piece. The checks establish legacy compatibility, continuous weighting, direction and absence of reader mutations. They do not establish enactments, budget effects or person-level consequences of these laws.

## 6. Proof run

The bounded existing officeholder test file passed eight tests before stacking onto the newly published schema. Its ordinary-opening fixture is in Oregon with seed `officeholder-principles-US-OR`. The final stacked checks are recorded in the pull request receipt. A new watched nationwide legislative proof is not run by this consumer branch. The separate audit task retains its frozen source and does not acquire this change during a campaign.

## 7. Worked example

The authored fixture gives one person a supporting principle strength of 0.75 and an opposing strength of 0.5. With omitted weights, the existing scale produces 3 minus 2, or a score of 1, and a reason for voting yes. Weights of 0.2 and 0.9 produce 0.6 minus 1.8, or negative 1.2, and a reason for voting no. Reversing the bill's answer reverses that reason. Two zero weights yield no principle reason. These are measured fixture results, not a named person's watched vote or a money consequence.
