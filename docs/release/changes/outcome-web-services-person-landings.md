# Service opportunities reach residents and households

Six service links now use the shared person and official-view path. Electricity
and broadband use recorded household membership. Traffic, roads, rail, and
parks use resident estimates. Individual use and payments remain unmeasured.

## Evidence

Measured in the plan: traffic selects the resident rule at
`data/research/outcome-web/landing-plan.json:94`.

Measured in the plan: electricity and broadband select the household rule at
`data/research/outcome-web/landing-plan.json:478` and
`data/research/outcome-web/landing-plan.json:1017`.

Measured in the plan: roads, rail, and parks select resident rules at
`data/research/outcome-web/landing-plan.json:1184`,
`data/research/outcome-web/landing-plan.json:1208`, and
`data/research/outcome-web/landing-plan.json:1231`.

Broadband's four missing territory rates are inferred from the median of 52
recorded places, 92.8%, at
`data/research/outcome-web/placeholder-ledger.json:55`.
Measured in source: the shared reader skips the nine explicitly unsupported
rail places at `src/simulation/outcome-web/person-outcome-landings.ts:693`.

## Next steps

This draft needs focused checks before acceptance. Four budget links and two
links without live readers remain. No tests or generated-world runs were
performed for this slice.
