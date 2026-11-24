# Census rerun, October 20, 2026

Seven stopgap rows from the October 19 research were redone with real Census Bureau data once an API key was available: `SG-WORLD-housing-county-estimate`, `SG-WORLD-property-tax-rate`, `SG-PW8-partnership-start`, `SG-CORE-district-placement`, `SG-P15-kin-generation`, `SG-P15-partnership-model` and `SG-P15-moves-weights`. `SG-GOV-start-law-carried-back` is unchanged (no Census data applies).

`census-rerun.results.json` holds one result per row in the same shape as the parent folder's files (recommended value, spread, basis, fetched sources, confidence, builder note). These replace the matching rows in `../D-economy-world.json`, `../E-careers-finance.json` and `../C-government-law.json`. Large tables sit in `census-<id>.json`; the place-level partnership table covers 31,817 places with a shrink-toward-state formula.

Notes for builders: the employed-versus-unemployed job hold in `SG-P15-moves-weights` measures 0.05, not the 0.48 now in the game; and the county-to-hour translation puts 0.57 of parents and 0.45 of adult children outside the county nationally, not 0.35 and 0.28.
