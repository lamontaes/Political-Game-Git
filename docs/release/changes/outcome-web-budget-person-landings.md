# Borrowing costs reach residents as fiscal estimates

Four borrowing-cost links now use the shared person outcome and official-view
path. Residents receive an estimate of their jurisdiction's debt-service
context. The existing government budget reader still uses the changed rate
when a deficit requires borrowing.

## Evidence

Measured in the plan: the four links select resident estimates at
`data/research/outcome-web/landing-plan.json:1041`.

Measured in source: deficit borrowing uses the current place borrowing-cost
change at `src/simulation/public-budgets/month.ts:1279`.

The resident fiscal effect is inferred. Its SEC and GFOA sources and limits
are recorded at `data/research/outcome-web/placeholder-ledger.json:115`.
No personal tax bill, payment, private loan, bondholding, or service cut is
produced by this estimate.

## Next steps

Review the resident estimates and official reflection before acceptance.
The birth-rate and groundwater links still need live person readers.

## Checks

Changed-file formatting and linting are checked for this draft.
No tests or generated-world runs were performed for this slice.
