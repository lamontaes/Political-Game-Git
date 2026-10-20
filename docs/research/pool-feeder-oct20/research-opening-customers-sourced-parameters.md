# research-opening-customers-sourced-parameters

Oct 20 pool-feeder research for five opening-customer rows. All five were worked on Oct 19 (low confidence); this file reuses those results by file and key. Four are ESTIMATED figures and one is a mechanical allocation. No new fetches changed them.

## SG-P8-opening-customer-generation

- Feeds: src/core2/data/opening-customers.json; parameters.json openingCustomer* rows
- Recommended: Draw household budgets lognormally around the CEX mean with coefficient of variation 1.0 (sigma 0.83, mean preserved); weight vendors by capacity times distance instead of equal shares.
- Low / high: CV 0.7 / CV 1.5
- Unit: coefficient of variation
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/B-people-behavior-2.json key SG-P8-opening-customer-generation (confidence low) — reasoning only; CEX publishes means, not dispersion, and no fetched page gives the CV
- Note: Seeded generation of who exists is allowed by No dice; the draw sets budgets, not any actor's choice.
- builderNote: Add openingCustomerBudgetCv = 1.0 and sample budgets lognormally with the mean fixed to the CEX value.

## SG-P8-opening-customer-public-procurement

- Feeds: src/core2/data/opening-customers.json; parameters.json cleaning and coverage rows
- Recommended: Public cleaning budget share 0.12 of public-building spending; local authority coverage 0.25 kept.
- Low / high: 0.08 / 0.19
- Unit: fraction
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/B-people-behavior-2.json key SG-P8-opening-customer-public-procurement (confidence low) — IFMA via FMLink, New IFMA survey reports median cost of operations $5.59/RSF, 2000 — https://www.fmlink.com/?p=13268 — "median janitorial cost alone was $1.08 per square foot"
- Note: 1.08 / 5.59 = 0.19 is the janitorial share of operating cost; 0.12 allows for capital outlay. The source is from 2000 and the coverage 0.25 has no source.
- builderNote: Set the cleaning share to 0.12 (0.08 to 0.19) tagged ESTIMATED; keep coverage 0.25 labeled ESTIMATED until the procurement module supplies dated awards.

## SG-P8-outside-product-demand-crosswalk

- Feeds: src/core2/data/opening-customers.json (zero-receipt booked firms)
- Recommended: Outside-buyer share of revenue: tradable classes (manufacturing, agriculture, quarrying, freight) 0.8; local-serving classes 0.03.
- Low / high: 0.0 / 1.0
- Unit: share of revenue
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/B-people-behavior-2.json key SG-P8-outside-product-demand-crosswalk (confidence low) — BEA, U.S. International Trade in Goods and Services, Annual 2021, 2022 — https://www.bea.gov/sites/default/files/2022-02/trad1221annual-fax.pdf — "exports ... to $2,533.0 billion" (about 10.9% of GDP by the researcher's derivation)
  - Moretti, Local Multipliers, via CEDLAS summary, 2010 — https://www.cedlas.econo.unlp.edu.ar/wp/wp-content/uploads/doc_cedlas153.pdf — "1.6 nontradable jobs arise"
- Note: The 0.8 and 0.03 are estimates from the national export share and the tradable/nontradable split; no fetched page gives them.
- builderNote: Add per-classification outsideDemandShare (0.8 tradable, 0.03 local-serving) tagged ESTIMATED; the later trade module replaces it.

## SG-P8-opening-public-owner-history

- Feeds: src/core2/opening-public-owner.ts
- Recommended: Carry the observed 2017 county identity forward; treat as still active at opening (about 0.99 of counties).
- Low / high: 0.97 / 1.0
- Unit: share of counties unchanged
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/B-people-behavior-2.json key SG-P8-opening-public-owner-history (confidence low) — U.S. Census Bureau, Census of Governments organization report, 2025 — https://cdn.www.census.gov/content/dam/Census/library/publications/2025/econ/govtorg2225.pdf — "3,031 counties in the 2017 Census of Governments"
- Note: No dice flag: 0.99 is an audit band for how often the carry-forward is wrong, never a probability that picks a county's fate. The stopgap's real replacement is a dated directory or legal change history.
- builderNote: Keep the carry-forward; record 0.99 only as the expected share unchanged for the proof, and keep the stopgap registered.

## SG-P8-opening-public-owner-coverage

- Feeds: src/core2/opening-public-owner.ts
- Recommended: Represented share = cohort residents divided by county residents (mechanical allocation).
- Low / high: 0.0 / 1.0
- Unit: share
- Tag: MECHANIC (builder)
- Sources:
  - data/research/stopgaps-oct19/B-people-behavior-2.json key SG-P8-opening-public-owner-coverage (confidence low) — game repo src/core2/opening-public-owner.ts, read Oct 19; no external source measures public-buyer reach
- Note: This is arithmetic from Census 2020 geography already in the repo, not an empirical rate.
- builderNote: Scale the bounded purchase plan by cohortResidents / countyPopulation, tagged ESTIMATED, until own-county procurement records exist.
