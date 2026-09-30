# Forgiven student debt leaves more money at home

Before: the student-loan forgiveness question could pass without canceling a borrower's debt or changing federal spending.

After: an eligible borrower's recorded federal student debt falls by up to the bill's cap. Future payments shrink, leaving more household cash. The federal treasury records the cancellation as education spending. Loan history survives saving and reopening.

## Measured result

The controlled Abingdon, Illinois borrower receives $10,000 of cancellation and keeps $1,245.48 more cash over 365 days. The monthly payment falls from $233.52 to $129.73. Federal education spending rises by $10,000. These figures come from `src/simulation/student-debt-relief-law.test.ts:162`, using the normal clock after a controlled enactment.

The five-file focused regression passes 67 tests, including debt integrity, enactment and treasury behavior. This borrower test is controlled component evidence. The full observer-world proof across 92 laws remains pending.

## Implementation and remaining estimates

Implementation read: `src/simulation/household-loans.ts:692` records cancellation separately from a cash payment. `src/simulation/student-debt-relief-law.ts:142` checks recorded income and the cap across the person's federal loans. `src/simulation/public-budgets/federal-treasury.ts:321` charges the cancellation to federal outlays.

Modeled starting balances use Federal Reserve averages and a spread from age and recorded pay in `data/research/laws/student-debt-relief.json:11`. PLACEHOLDER: education-financing inference uses recorded attendance and current liquid resources rather than a complete historical tuition and family-contribution ledger. A missing income record does not establish eligibility. Existing loans take precedence over estimates.

Implementation read: `data/research/outcome-web/links.json:2567` records the outcome-web default-rate benchmark. It is a provisional proxy from a private-debt discharge study. Actual balances and payments follow the loan ledger; individual defaults are never assigned from that rate. Implementation read: `data/research/outcome-web/links.json:3440` keeps the poverty link unchanged.
