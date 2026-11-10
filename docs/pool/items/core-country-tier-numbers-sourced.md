---
id: core-country-tier-numbers-sourced
title: "The country tier's 157 numbers are working values set by hand: source each from its published table"
area: core
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: money
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
standard: 2
model: sonnet
effort: medium
root: design-country-tier
---

**What.** Every number in the country tier's rules sits in src/core2/data/country/parameters.json with the tag TUNABLE and the stopgap SG-NATION-country-tier-working-values. They cover what each income fifth spends and holds as cash, each sector's pay share and pay level, the household basket, how much of each sector is traded between states, how fast firms adjust staff and prices, the matching of people and openings, how strongly movers answer pay after tax and work, and births, deaths and aging. Each was set near a figure the builder knew and checked only for a calm forty-year run. The building session could not reach the BLS and Census hosts. This item fetches each figure's table, sets the value with its citation and spread, and marks it SOURCED or ESTIMATED.

**Cause.** Design: docs/design/country-tier.md. Every number in src/core2/data/country/parameters.json is a hand-set working value tagged TUNABLE (stopgap SG-NATION-country-tier-working-values), set near a figure the builder knew and checked only for a calm forty-year run.

**Fix.** Fetch each figure's table, set the value with its citation and spread, and tag it SOURCED or ESTIMATED, or give a one-line reason it stays TUNABLE. Report what the sourced values do to a state ending its income tax.

**Time box.** 8 hours for a Sonnet session.

**Rules.** Research before building, and real data only calibrates: a sourced number sets a rule's size and never decides an outcome. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE with its role. No steering: no row may become a level the month is pulled toward. Skill researcher says how a row is sourced from pages actually fetched.

**Done when.** A second session reads src/core2/data/country/parameters.json and sees each row tagged SOURCED or ESTIMATED with a citation to a page that was fetched and a spread, or a one-line reason it stays TUNABLE. src/core2/country-model.test.ts passes in three drawn seeds, each printed, and a forty-year run from the opening in a drawn place, printed in the pull request, shows no state with more jobs than adults in any month. The PR says what a state ending its income tax does under the sourced values.

**Waits on.** BLS and Census hosts reachable from the session (the building session could not reach them; an environment network setting).

**Files.** src/core2/data/country/parameters.json, src/core2/country-model.ts, src/core2/country-model.test.ts, src/core2/data/stopgaps/nation.json, docs/research/

**Notes.** Rows that matter most to what the owner will see: countryMoveIncomeElasticity and countryMovePushElasticity (how many people a tax change moves), countryStaffAdjustPerMonth and countryFirmSpread (how fast jobs answer sales), countryPayPerLogTightness and countryPricePassPerMonth (inflation). With the working values, a state that ends its income tax loses about 9% of its budget and does not gain people over three years; say in the pull request what the sourced values give.
