# Place population intake: current Census estimates and coverage

Research checked on September 22, 2026. The queued question asks for the latest Census population estimate for every incorporated place in the fifty states, D.C., and Puerto Rico, by seven-digit place GEOID. It expected the Vintage 2024 subcounty file.

## Finding: update expected vintage; define Puerto Rico scope separately

**For the 50 states plus D.C., use Census Population Estimates Program Vintage 2025 subcounty estimates.** Census calls it the latest full vintage. The city and town estimates cover July 1, 2025, and were released in May 2026. Earlier vintages were superseded. Census' schedule lists the next city and town estimates for May 2027. Vintage 2025 is therefore the latest as of September 22, 2026. [Census city/town dataset](https://www.census.gov/data/datasets/time-series/demo/popest/2020s-total-cities-and-towns.html) · [Census schedule](https://www.census.gov/programs-surveys/popest/about/schedule.html) · [Vintage 2025 release page](https://cdn.www.census.gov/newsroom/press-kits/2026/vintage-2025-city-town-pop-estimates.html)

Official all-place CSV: [sub-est2025.csv](https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv). It is about 7.5 MB, last modified May 14, 2026. File layout: [SUB-EST2025.pdf](https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2025/SUB-EST2025.pdf). The file layout calls release May 2026; estimates span April 1, 2020 base through July 1, 2025; geographies are as of January 1, 2025.

**Puerto Rico has no Census-recognized incorporated places.** The Census geography glossary states that Hawaii, Puerto Rico, and Guam have no incorporated places recognized by Census; Puerto Rico's zonas urbanas and comunidades are CDPs. Thus there cannot be a Puerto Rico incorporated-place SUMLEV 162 row in this file, and no Puerto Rico “incorporated place GEOID” answer exists under this definition. [Census Geography Glossary](https://www.census.gov/programs-surveys/geography/about/glossary.html) · [Census Places chapter](https://www2.census.gov/geo/pdfs/reference/GARM/Ch9GARM.pdf)

For Puerto Rico's 78 governmental municipios, use Census' separate [Puerto Rico Municipios Population Totals](https://www.census.gov/data/datasets/time-series/demo/popest/2020s-total-puerto-rico-municipios.html). Its Vintage 2025 series covers April 2020 through July 2025. These are municipalities, not incorporated-place geographies. The delivered file uses official five-digit county/municipio FIPS codes from Census' [all-geocodes file](https://www2.census.gov/programs-surveys/popest/geographies/2025/all-geocodes-v2025.xlsx); it does not assign seven-digit place GEOIDs. Puerto Rico CDPs and urban zones are separate geographies. [Census geography glossary](https://www.census.gov/programs-surveys/geography/about/glossary.html)

## Exact CSV fields and observed coverage

The source CSV contains geography codes, names, a 2020 base, and annual population estimates through 2025. The Census layout defines summary level 162 as incorporated place, 170 as consolidated city, and 172 as a place within a consolidated city. Keep leading zeroes in state and place codes. [Official file layout](https://www2.census.gov/programs-surveys/popest/technical-documentation/file-layouts/2020-2025/SUB-EST2025.pdf)

The source file does **not** carry a ready-made GEOID column. For incorporated-place rows, construct the seven-character place GEOID as the two-character `STATE` FIPS string followed by the five-character `PLACE` FIPS string. Keep `SUMLEV=162` as the filter. Preserve NAME/STNAME and the source codes as audit columns. Do not use county, MCD or CONCIT codes as a substitute for place GEOID.

The delivered nationwide CSV contains 19,483 SUMLEV 162 rows across 50 states and D.C. It has no duplicate seven-character `STATE+PLACE` IDs and no blank 2025 estimates. Four rows have an explicit numeric estimate of zero; Puerto Rico FIPS 72 is absent. SUMLEV 162 also includes one Hawaii exception: `STATE=15 PLACE=71550 NAME=Urban Honolulu CDP`. The delivered file flags it as a CDP, so the 19,483 rows must not all be called incorporated places. A missing row or estimate remains UNKNOWN, distinct from the four actual zeroes.

## Delivered nationwide files

- [50 states and D.C. place estimates, Vintage 2025 CSV](https://drive.google.com/file/d/1zjaI7WlwdLH5CXdsVWrWuFTFfI4nuwLh/view): all 19,483 SUMLEV 162 rows, including the flagged Urban Honolulu CDP exception. Each row preserves the source URL and Census codes.
- [Puerto Rico municipio estimates, Vintage 2025 CSV](https://drive.google.com/file/d/1NInP3qRq_0-lYpryv7_tbwlee0043n7A/view): all 78 municipios, with five-digit FIPS IDs. Each row preserves the population and geocode source URLs.

These are source tables for review. They do not claim that every game place has already been matched or that a 2025 estimate is a live 2026 population.

## Reproducible extraction and coverage plan

1. Fetch the one official CSV URL above and record retrieval date, source URL, file byte size/hash, and the official file-layout URL/release date alongside the output.
2. Parse as CSV strings first. Filter exactly `SUMLEV == "162"`; do not numeric-cast codes before constructing IDs. Build `GEOID = STATE.zfill(2) + PLACE.zfill(5)` (source values already padded); select July 1, 2025 population from `POPESTIMATE2025`, preserving the raw source string and parse as an integer only after checking nonblank numeric content.
3. Assert uniqueness of GEOID; expected reference count for the retrieved Vintage 2025 file is 19,483; check that 50 state FIPS codes and D.C. FIPS 11 are represented and PR FIPS 72 is absent. These are validation expectations, not synthesized place records.
4. For any required game place that has no matching row, retain `population = UNKNOWN` and separately record “not matched to Census incorporated place,” then investigate legal/statistical geography type. Never synthesize a place, carry the prior vintage forward silently, or convert null to zero. Treat explicit `POPESTIMATE2025=0` as zero, distinct from UNKNOWN.
5. Treat Vintage 2025 estimates as a consistent revised series; do not merge earlier Vintage 2024 rows into it. Check Census errata/updates if a release correction is posted before the eventual data freeze.
6. Handle Puerto Rico separately: if its actual governmental units are needed, ingest all municipio rows from `PRM-EST2025-POP` as municipio entities after inspecting the file layout and identifier fields. Do not label those rows incorporated places or concatenate IDs into a US place GEOID. If the requested universe insists on incorporated places, report PR as “no Census-recognized incorporated places,” not zero population.

## Evidence limits / UNKNOWNs

- Confirmed current official nationwide source and Vintage 2025 release status for 50 states + D.C.
- Confirmed lack of Puerto Rico incorporated-place geographies; separate municipio estimates exist.
- Municipio identifiers were matched to Census' all-geocodes file; any game-place join still needs verification against the game's geography model.
- The estimate's reference date is July 1, 2025, not “today” in the literal 2026 sense. Census place estimates are annual and are not a live 2026 population count.
