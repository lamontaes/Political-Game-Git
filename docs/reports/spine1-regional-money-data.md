# Regional wages and businesses now have a sourced starting map

The money spine has a source-only regional starting map for occupational pay, county business mix, and public employee roles. County wage areas cover the 50 states and Washington, D.C. A dated Census 2023 Connecticut supplement now resolves the 215 place joins that failed against the older 2020 county records. The data can distinguish rural Mississippi, Columbus, and San Francisco without assigning any person a job or changing pay in a save. Elected office salaries and the player route still need separate work.

## What the sources establish

The [BLS May 2025 OEWS tables](https://www.bls.gov/oes/tables.htm) publish state, metropolitan, and nonmetropolitan occupational employment and pay. The import contains 236,120 state and area occupation rows across 530 wage areas. Each annual wage is in U.S. dollars. The original cell is retained beside its numeric value; `*`, `#`, and blank cells remain missing values, never zero. The [BLS methods](https://www.bls.gov/oes/methods_25.pdf) describe annual estimates and the survey's wage and salary employee scope.

The [July 2023 Census CBSA delineation](https://www.census.gov/geographies/reference-files/time-series/demo/metro-micro/delineation-files.html) and [BLS May 2025 area definitions](https://www.bls.gov/oes/2025/may/oessrcma.htm) produce 3,222 county or county-equivalent rows. Every mapped BLS area has a wage row. The BLS county file supplies the nonmetro wage regions that a CBSA-only map cannot specify. The Census CBSA and BLS wage area codes remain separate fields because metro divisions and source vintages can differ.

A CBSA can be micropolitan while its OEWS wage observation belongs to a nonmetropolitan area. Bolivar County is one such case: Census assigns CBSA `17380`, while BLS assigns wage area `2800005`. The import retains both codes and uses the BLS code for wage lookup. It never treats a micropolitan CBSA code as an OEWS wage area.

The [Census 2023 County Business Patterns county file](https://www.census.gov/data/datasets/2023/econ/cbp/2023-cbp.html) supplies 52,939 county and two-digit industry rows for 3,142 U.S. counties. The rows retain establishment counts, March employment, employment-size buckets, and original suppression and noise marks. State residual code `999` is excluded from county coverage. The 2023 county file has no county row for Kalawao County, Hawaii (`15005`), or King County, Texas (`48269`); those remain missing. The file is for the United States county dataset, so Puerto Rico's 78 BLS county equivalents have no matching row in this CBP import.

The [BLS May 2025 ownership tables](https://www.bls.gov/oes/tables.htm) and [state ownership research estimates](https://www.bls.gov/oes/oessrcres.htm) supply 36,639 federal, state, and local government occupation rows. All 50 states and Washington, D.C. appear in the state research file; the file also has three territories. The state observations are tagged `state-research`. BLS warns that these estimates may have higher model error, fewer occupations, and fewer quality checks than its standard estimates. Occupational groups are useful for public role calibration, but these files do not publish the statutory salary of a mayor, governor, legislator, or other particular office.

## Three places in the locked data

These are source observations, not wages or employers assigned to a game person. A retail salesperson's May 2025 area median annual wage differs across the three examples:

| County                                     | BLS wage area                               | Retail median annual wage | 2023 county establishments | Largest two-digit establishment sector                                        |
| ------------------------------------------ | ------------------------------------------- | ------------------------: | -------------------------: | ----------------------------------------------------------------------------- |
| Bolivar County, Mississippi (`28011`)      | West Delta Mississippi nonmetropolitan area |                   $26,790 |                        709 | Retail trade (`44`), 145 establishments                                       |
| Franklin County, Ohio (`39049`)            | Columbus, OH                                |                   $33,780 |                     30,700 | Health care and social assistance (`62`), 4,436 establishments                |
| San Francisco County, California (`06075`) | San Francisco-Oakland-Fremont, CA           |                   $43,850 |                     33,378 | Professional, scientific, and technical services (`54`), 7,220 establishments |

The source compiler and validator reproduce these values from the locked BLS and Census files. CBP counts establishments by county; the OEWS wage area often spans several counties. The table therefore does not claim county-specific retail wages.

## Place coverage and the dated boundary

The existing Census 2020 place-to-county corpus has 33,037 place-county parts for 31,617 places across the 50 states and Washington, D.C. Its direct join to the May 2025 BLS county area map resolves 31,402 places and leaves 215 Connecticut places unmatched. The [Census explanation of the change](https://www.census.gov/programs-surveys/geography/technical-documentation/county-changes/2020.html) establishes why: the 2020 relation uses eight legacy Connecticut counties, while BLS uses the nine planning regions adopted as county equivalents in 2022.

The [Census ACS 2023 five-year geography file](https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/documentation/Geos20235YR.txt) has 215 Connecticut place/county-part rows with exact place and planning-region county identifiers. They match 215 whole-place rows and nine county-equivalent rows in the same file. The dated supplement replaces only Connecticut parts in this validation join; it does not rewrite the 2020 source.

The supplement shares 214 place IDs with the 2020 Connecticut set, retires `0908910`, and adds `0909050`. All 31,617 places in the resulting mixed-vintage 50-state-and-D.C. audit now join to a BLS wage area, with no unmatched county code. This establishes source coverage for those place records, not a runtime selection rule or a uniform 2023 place geography nationwide.

The 2020 corpus has 1,294 places with parts in multiple counties. In the mixed-vintage audit, 1,293 places span multiple counties and 470 cross more than one BLS wage area. A later runtime selector must use the person's actual county or another approved location rule rather than assign one area per place name. The place relation corpus and Connecticut supplement have no territory rows; the BLS county map includes Puerto Rico, but that does not prove a Puerto Rico place-to-area join. Guam and the Virgin Islands occur in state wage releases without place coverage from this corpus.

## Handoff and limits

The importer in `scripts/source/regional-money/` locks original publisher ZIP/XLSX bytes, emits deterministic compressed corpora, and records SHA-256 digests, URLs, vintages, units, and row counts in each owned source directory. All seven initial raw publisher files are committed so replay does not depend on a private browser download. The Connecticut follow-up adds one original 91,867,232-byte Census text file, a separate compressed 2023 place/county-part corpus, and its digest and coverage manifests. No second raw copy is kept in the worktree. The initial source package added about 114 MiB; the follow-up adds about 88 MiB. The data has no runtime job, pay, business, or economic-context binding.

The next money-spine phase must choose how a generated employer and person receive a regional occupation and wage, how industry counts shape businesses, and how those facts persist in a save. Office-specific salary rules need an additional office-level source or an approved authored calibration rule. Do not treat the public occupation median as an enacted office salary. Territory place coverage and an ordinary-player route remain open.

Validation on the initial data branch: the dedicated cross-corpus validator and deterministic compiler replay passed, with all 530 BLS wage areas resolved from county mappings, all 51 required state and D.C. codes present, and the two U.S. CBP county gaps identified. The follow-up compiler replay and validator check the new Connecticut artifact and before/after place IDs, then record zero unresolved places in the mixed-vintage audit. No browser or player acceptance was run for this data-only phase.
