# Firearm safety estimates reach residents

Two firearm-homicide links now use the shared resident and official-view path.
They describe changes in a resident's safety context. They do not create an
injury, death, or personal victimization record.

## Evidence

Measured in the plan: both links select the resident rule and treat a higher
homicide rate as a cost at `data/research/outcome-web/landing-plan.json:82`.
Measured in the data: the starting rate covers all 56 places at
`data/research/outcome-web/place-outcome-bases-2024.json:3199`.
The personal context is inferred from the place rate. The national firearm-share
assumption and existing territory proxies are preserved in
`data/research/outcome-web/placeholder-ledger.json:28`.

## Next steps

The draft checkpoint needs focused tests before acceptance. Ordinary
generated-world behavior has not been checked.
