# Weighted arguments supplied reasons for 76 Georgia decisions

The saved Georgia comparison changed 76 decisions from present to yea because opposing principles stopped canceling. It produced no yea-to-nay reversal. The largest remaining gap is coverage: 7,417 decisions had no contributing principle record. Party and district considerations were absent from this comparison. Teams should improve supported principle formation and measure sponsored bills with constituency inputs before treating these probes as evidence about ordinary floor votes.

## The three largest principle contributions

Measured reconstruction ranks distinct principles by their largest absolute weighted contribution in any member-question pair. The signed contribution remains visible. These are component scores, rather than the evaluator's final option scores. All examples come from the Abbeville, Georgia world.

| Rank | Principle and named member | Weighted component | Net unweighted → weighted | Disposition | Saved paired evidence |
| --- | --- | ---: | --- | --- | --- |
| 1 | Collective provision; Priya Peters, Georgia House seat 5; Medicaid eligibility expansion | +2.196875 | +2.3125 → +2.196875 | yea → yea | docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv:3426 |
| 2 | Environmental stewardship; Priya Peters, seat 5; clean electricity standard | +1.6625 | +1.75 → +1.6625 | yea → yea | docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv:9366 |
| 3 | Limited government; Cameron Salas, seat 2; legislative term limits | +1.575 | 0 → +0.35 | present → yea | docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv:1803 |

Measured strict ranking of individual contribution rows instead yields three equal first-place values of +2.196875 on Medicaid expansion. Priya Peters, Anna Terrell and Jasper Byrd occupy seats 5, 11 and 19. Their evidence is the paired CSV at lines 3426, 3432 and 3440. This tie uses CSV order as its display order; it assigns no substantive priority among the members.

Inferred from saved scores, Cameron's limited-government component is +1.75 × 0.90 = +1.575. His tradition component is −1.75 × 0.70 = −1.225. Their weighted sum is +0.35; their unweighted sum is zero. The saved comparison identifies both records and the resulting dispositions at the paired CSV:1803. The production reader multiplies signed strength by four and the argument weight in src/simulation/governing/officeholder-principles.ts:119.

## Missing principles explain present; signs explain the missing reversals

Measured across 68 probes and 180 members, the CSV contains 12,240 paired decisions. Weighted dispositions are 2,836 yea, 1,987 nay and 7,417 present. Unweighted dispositions are 2,760 yea, 1,987 nay and 7,493 present. The complete denominator starts at docs/codex/handbacks/team-2-georgia-all-catalog-weight-comparison.csv:2.

Measured, 4,509 of 12,240 rows cite one contributing record; 314 cite two; 7,417 cite none. Every weighted zero-score row cites no contributing record. Absence here means no saved, unconflicted record contributed to this question. It does not prove the person has no principles. The production reader skips missing or conflicted records in src/simulation/governing/officeholder-principles.ts:114.

Measured, 4,823 of 12,240 raw principle sums change. None changes from positive to negative or negative to positive. The 76 zero-to-positive changes are 38 legislative-term-limit decisions and 38 abortion-restriction decisions. Cameron's abortion score changes from zero to +0.2625 at the paired CSV:10983. For builders, the missing reversals follow from these saved signs; there is no evidence that party considerations overwhelmed a reversed principle score.

Measured band reconstruction gives 7,493 zero, 4,536 slight and 211 moderate unweighted scores. Weighted scores give 7,417 zero, 4,742 slight and 81 moderate. No score reaches strong or decisive in either arm. The 206 band changes comprise 76 zero-to-slight and 130 moderate-to-slight changes. Production thresholds are 3, 6 and 9 in src/simulation/governing/officeholder-principles.ts:24.

Measured production behavior turns any nonzero score below three into a slight, high-confidence consideration in src/simulation/governing/officeholder-principles.ts:167. That consideration contributes three evaluator points because slight importance is one and high confidence is three in src/simulation/decisions.ts:45. Moderate importance contributes six points. Thus the weighting changes numerical strength much more often than disposition. Builders should distinguish raw principle sums from the discretized decision scores.

## Party, district and other terms

Inferred from the pinned runner input, all 12,240 pairs have no party consideration: every probe has no sponsor, and no partisan contest is supplied. The runner explicitly sets sponsorPersonId to null in scripts/governance-proof/team2-georgia-weight-comparison.ts:97. Production returns no party consideration when no same-party sponsor exists and the question is uncontested in src/simulation/governing/chamber-votes.ts:704. The receipt does not export members' party affiliations; no affiliation is invented here.

Inferred from the pinned runner input, all 12,240 pairs have no constituent consideration because the input omits constituencyId in scripts/governance-proof/team2-georgia-weight-comparison.ts:138. Production supplies that consideration only when the caller supplies the ID in src/simulation/governing/chamber-votes.ts:280. Seat numbers identify chamber seats; the saved receipt does not identify the geographic districts or residence of these simulated members.

Inferred from the same input, executive and budget-deadline considerations are absent. The runner supplies no executive person and creates general-policy probes in scripts/governance-proof/team2-georgia-weight-comparison.ts:95. Production gates those terms on executivePersonId and appropriation status in src/simulation/governing/chamber-votes.ts:283.

Measured, Cameron's unweighted term-limit ballot carries member:no-reason and the weighted ballot carries member:principle:for. The changed-decision JSON preserves those exact reasons. Other paired rows export scores and dispositions, but no full consideration stack. Committee, trusted-colleague, public-position and private-belief magnitudes therefore remain unmeasured for unchanged rows. Builders must export each consideration and final option score before claiming a complete term-by-term diagnosis.

## What teams should do next

The formation team owns supported records for people and questions now lacking contributing principles. The chamber team owns a sponsored-bill comparison with actual constituency inputs and full consideration receipts. Catalog teams should retain the current component weights as authored relevance choices unless research supports a replacement. This diagnosis introduces no new conviction, authored curve or production change.

## Method and limits

Receipts were read at f4022d0e38e28430ee6df4d5d697560267122f56. Their runner pin is 762b030224533dbc5a4bbb838de6386924b10eb8; production pin is 80dba335a62f77d6a45c38919105991658ccf1de. Production citations above refer to the production pin; runner citations refer to the runner pin.

Inferred reconstruction intersects saved catalog definition IDs across questions citing each record. All 181 record IDs resolve uniquely, and each has a saved single-record row that determines signed strength times four. Applying saved weights reproduces all 12,240 weighted sums with zero floating-point residual. The bounded reconstruction receipt is docs/codex/audit-systems-vote-diagnosis.json:1. Principle names come from src/simulation/policy-pack-us-policy-positions.ts:61, with collective provision at line 67 and environmental stewardship at line 108. No simulation was launched, and original comparison and 1255 receipts were preserved.
