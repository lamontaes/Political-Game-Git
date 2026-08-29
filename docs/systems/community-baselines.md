# National Community & Demographic Baseline Compiler (ACS 5-Year)

## Scope and Authority

This document defines the technical and governance contract for political and community demographic baselines grounded in the U.S. Census Bureau American Community Survey (ACS) 5-Year data series.

It adheres to:

- **Game Constitution Principles**:
  - Principle 9 (Data-driven government institutions and rules),
  - Principle 15 (Geography matters: coalitions, reputation, and political appeal vary by place),
  - Principle 16 (Populations, coalitions, demographics, and institutions evolve),
  - Principle 25 (Real-world starting data snapshots and simulated save-world history are distinct data domains).
- **Decision Log**:
  - D-007 (Data-driven jurisdictions),
  - D-009 (Separate snapshot and save-world domains),
  - D-042 (Quantitative truth, observation vintages, and fallible measurements).

## Non-Violations and Behavioral Guarantees

1. **Strict Anti-Stereotyping Barrier**:
   - Demographic data reflects **aggregate community characteristics** (e.g. median household income, educational attainment distribution, occupational mix, age structure).
   - **DO NOT create political opinions from demographics.**
   - **DO NOT infer individual beliefs or voting choices from group characteristics.**
   - Individual NPCs form beliefs sparsely through personal history, memories, relationships, and direct experiences (Constitution Principle 8, D-018, D-020).

2. **Never Collapse Estimate and Truth**:
   - ACS estimates represent sample-based statistical approximations, not omniscient canonical truth.
   - Ground truth during simulation execution is owned by canonical world history (D-042); real-world baseline snapshots serve exclusively as starting context.

3. **Never Treat Margin of Error (MOE) as Zero**:
   - Every ACS measure retains its paired 90% confidence Margin of Error reported by the Census Bureau.
   - When MOE is controlled (e.g. Population Estimates Program totals, `-666666666` or `*****`) or open-ended (`-888888888`), it is preserved as `marginOfError: null` with an explicit `moeAnnotation`, never converted to zero.

4. **Universe Safety**:
   - Every measure is strictly tied to its official Census universe (e.g., `Population 25 years and over`, `Civilian labor force 16+`, `Households`, `Workers 16+`).
   - Cross-universe operations (such as calculating educational attainment share over total population rather than adults 25+) are rejected by `assertUniverseCompatible`.

5. **Vintage Purity**:
   - Different ACS 5-year vintages cannot be silently mixed within a dataset or arithmetic comparison.

## Bounded Variable Registry (16 Categories)

The compiler supports an extensible, bounded variable registry covering 82 variables across 16 core community domains:

| Domain Category            | Census Tables                | Canonical Universes                                          | Key Measures                                                                                                              |
| -------------------------- | ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1. Population              | `B01003`                     | `total_population`                                           | Total resident population                                                                                                 |
| 2. Voting-Age & CVAP       | `B09021`, `B29001`           | `total_population`, `citizen_population_18_and_over`         | Voting-age population (18+), Citizen Voting-Age Population (CVAP)                                                         |
| 3. Age Structure           | `B01002`, `B01001`           | `total_population`                                           | Median age, age brackets (<5, 5-17, 18-24, 25-44, 45-64, 65+)                                                             |
| 4. Sex                     | `B01001`                     | `total_population`                                           | Male population, Female population                                                                                        |
| 5. Educational Attainment  | `B15003`                     | `population_25_and_over`                                     | Less than HS, HS graduate/GED, Some college/Assoc, Bachelor's, Graduate/Professional                                      |
| 6. Household Income        | `B19013`, `B19025`, `B19001` | `households`                                                 | Median household income, aggregate income, 16 income distribution brackets                                                |
| 7. Poverty                 | `B17001`                     | `poverty_universe`                                           | Poverty universe, below poverty level, at/above poverty level                                                             |
| 8. Employment Status       | `B23025`                     | `population_16_and_over`, `civilian_labor_force_16_and_over` | Labor force, civilian employed, civilian unemployed, armed forces, not in labor force                                     |
| 9. Occupation & Industry   | `C24010`, `C24030`           | `civilian_employed_16_and_over`                              | Management/Business/Science/Arts, Service, Sales/Office, Natural Resources/Construction, Production/Transportation        |
| 10. Housing Tenure         | `B25003`                     | `occupied_housing_units`                                     | Owner-occupied housing units, Renter-occupied housing units                                                               |
| 11. Rent & Home Value      | `B25064`, `B25077`           | `renter_occupied_cash_rent`, `owner_occupied_housing_units`  | Median gross rent, Median home value                                                                                      |
| 12. Commuting              | `B08301`, `B08013`           | `workers_16_and_over`                                        | Drive alone, carpool, public transit, walk, other, work from home, aggregate travel time                                  |
| 13. Household Structure    | `B11001`, `B25010`           | `households`                                                 | Family households, married-couple, female householder no spouse, nonfamily, living alone, average household size          |
| 14. Disability             | `B18101`                     | `civilian_noninstitutionalized_population`                   | With disability, without disability                                                                                       |
| 15. Nativity & Citizenship | `B05001`                     | `total_population`                                           | Native-born US, native PR/islands, native abroad, naturalized US citizen, not a citizen                                   |
| 16. Race & Hispanic Origin | `B03002`                     | `total_population`                                           | Non-Hispanic White alone, Black alone, AIAN alone, Asian alone, NHOPI alone, Other alone, Multiracial, Hispanic or Latino |

## Geography-Safe Identifiers

All geographic entities are identified via canonical, hierarchical prefixed identifiers:

- **Nation**: `geo:us`
- **State**: `geo:state:<state_fips>` (e.g. `geo:state:21` for Kentucky, `geo:state:48` for Texas)
- **County**: `geo:county:<state_fips><county_fips>` (e.g. `geo:county:21067` for Fayette County, KY; `geo:county:48453` for Travis County, TX)
- **Place**: `geo:place:<state_fips><place_fips>` (e.g. `geo:place:2146027` for Lexington-Fayette, KY; `geo:place:4805000` for Austin city, TX)
- **Congressional District**: `geo:cd:<state_fips><cd_number>` (e.g. `geo:cd:2106` for KY-06)
- **Metro Area (CBSA)**: `geo:cbsa:<cbsa_code>` (e.g. `geo:cbsa:30460` for Lexington-Fayette MSA)
- **ZCTA**: `geo:zcta:<zcta5>` (e.g. `geo:zcta:40507`)
- **Census Tract**: `geo:tract:<state_fips><county_fips><tract6>` (e.g. `geo:tract:21067000100`, `geo:tract:48453000101`)
- **Block Group**: `geo:bg:<state_fips><county_fips><tract6><bg1>` (e.g. `geo:bg:210670001001`)

## Statistical Operations and Error Propagation

All statistical functions adhere to the official U.S. Census Bureau ACS Statistical Methodology handbook:

1. **Sum & Difference Error**:
   $$MOE_{sum/diff} = \sqrt{\sum MOE_i^2}$$

2. **Proportion Error ($P = X/Y$ where $X \subset Y$)**:
   $$MOE_P = rac{\sqrt{MOE_X^2 - (P^2 	imes MOE_Y^2)}}{Y}$$
   _(Falls back to the standard ratio formula if $MOE_X^2 < P^2 	imes MOE_Y^2$)_.

3. **Coefficient of Variation ($CV$)**:
   $$ SE = rac{MOE}{1.645}, \quad CV = \left(rac{SE}{	ext{Estimate}}
   $$

ight) imes 100\%$$

4. **Two-Sample Hypothesis Testing ($Z$-Score at 90% and 95% confidence)**:
   $$Z = rac{E_1 - E_2}{\sqrt{(MOE_1 / 1.645)^2 + (MOE_2 / 1.645)^2}}$$

## Regression & Portability Coverage

- **Regression Fixture**: Lexington-Fayette / Fayette County / Kentucky (`geo:place:2146027`, `geo:county:21067`, `geo:state:21`, `geo:tract:21067000100`).
- **Portability Fixture**: Austin / Travis County / Texas (`geo:place:4805000`, `geo:county:48453`, `geo:state:48`, `geo:tract:48453000101`).
- The architecture treats all geographic levels as uniform instances of the typed hierarchy without hardcoding any jurisdiction.

## Commands

- `npm run compile:community` — Compiles raw Census fixtures into normalized baseline snapshots and updates `data/community_baselines/manifest.json`.
- `npm run validate:community` — Audits integrity and SHA256 hashes of all compiled datasets.
- `npm run test:community` — Executes the focused test suite.

## Unresolved ACS Limitations

1. **Multi-Year Smoothing**: 5-Year ACS data pools 60 months of survey sampling. It represents an average over the period rather than a point-in-time snapshot, dampening rapid economic or demographic shocks.
2. **Small Area Sampling Noise**: Small geographic areas (census tracts, block groups) frequently exhibit higher sampling error (higher $CV$). Calculations on small sub-populations must always inspect the paired MOE.
3. **Non-Overlapping Period Comparison**: The Census Bureau advises against comparing overlapping 5-year periods (e.g. 2018-2022 vs 2019-2023) for trend analysis due to shared sampling observations.
