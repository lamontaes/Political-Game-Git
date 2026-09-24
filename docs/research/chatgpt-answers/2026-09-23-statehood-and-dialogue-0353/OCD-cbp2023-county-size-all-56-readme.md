# 2023 CBP shows establishment-size counts by county equivalent

This extract contains Census County Business Patterns records for 50 states, D.C., and five inhabited territories. Its 55,093 rows preserve published establishment counts by size category for 3,246 distinct named county-equivalent GEOIDs, plus county-code-999 rows spanning 54 jurisdictions. These are counts of establishments in size bands, not counts of workers in each band, named businesses, or job openings.

## The file

[Download the companion CSV](https://drive.google.com/file/d/1T-hKyxkwRvw2KjELyigljdOqqaz7Ys2H/view). It includes each jurisdiction’s published all-covered-industries total and published two-digit major-industry rows, matching the NAICS selector in the existing [county-sector extract](https://drive.google.com/file/d/1NG3w-Ukf-mIjYmGsOzbJVf2kD7O2B7in/view). A missing row remains absent; it is not filled with zero.

The file preserves source fields for state and county-equivalent codes, NAICS, establishment count, the source size-band counts, and the original employment and payroll values and flags. Added fields identify the county GEOID, whether a row is a named county equivalent or statewide unassigned, the published geography name, reference year, and source ZIP URL. Source strings are retained without coercion. In particular, records marked as statewide unassigned have county code 999 and a blank county GEOID; they are not assigned to a town or county. The extract has 785 county-code-999 rows across those 54 jurisdictions; the 3,246 named GEOIDs are distinct geographies, not row counts.

The size bands describe the number of establishments by establishment employment size. The source fields for establishments with 1,000 or more employees are reproduced exactly as delivered; do not recompute or add their values. The published flags paired with employment and payroll are retained as evidence. Those flags do not apply to the size-band columns. Raw size-band tokens, including nonnumeric tokens, remain unchanged. No missing value is changed to zero.

## Source and validation

Census’s [2023 County Business Patterns download page](https://www.census.gov/data/datasets/2023/econ/cbp/2023-cbp.html) identifies the 2023 release. The [state and D.C. county file](https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23co.zip) and the [Puerto Rico and Island Areas county-equivalent file](https://www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23pr_ia_co.zip) are the source archives. The extracted members are `cbp23co.txt` and `cbp23pr_ia_co.txt`. Geography names were matched from Census’s [state/county reference](https://www2.census.gov/programs-surveys/cbp/technical-documentation/reference/state-county-geography-reference/georef22.txt) and [Puerto Rico/Island Areas reference](https://www2.census.gov/programs-surveys/cbp/technical-documentation/reference/puerto-rico-geography-reference/georef_pr_ia.txt).

The source archives contained 1,100,961 and 16,953 raw records, respectively. The extract has 55,093 rows across 56 jurisdiction FIPS codes: 53,692 from the state/D.C. archive and 1,401 from the Puerto Rico/Island Areas archive. It contains 3,246 distinct named county-equivalent GEOIDs and 785 statewide-unassigned county-code-999 rows spanning 54 jurisdictions. All 23 raw source columns on every selected record were compared field by field against both official archives. The selected keys and count/employment fields also match the existing county-sector extract. The two source ZIP SHA-256 values are:

- `cbp23co.zip`: `e9539e96ceb91608ad44ab1cfc651d7c1ff9b88bddfe7a8ff64134ccde6e9603`
- `cbp23pr_ia_co.zip`: `d6aef1604af728969ea185db0b5aaa197bed95d40cf83354a7dc315d24f37d31`

CSV SHA-256: `4babdee4e64f692daecce900ddf8a0929da8be0cc90057d90bc371901f85e23f`.

## Limits for game use

CBP records establishments at county-equivalent geography. A county may contain multiple places, a place may cross county lines, and county-level counts do not identify which establishments are in a town. These data cannot support a town-specific roster or prove that a business is hiring. Use them as a broad statistical baseline for generated employer composition only, with explicit game calibration and drift. Do not treat a size-band count as a count of job vacancies, workers, firms, or offers.

Census’s [CBP methodology](https://www.census.gov/programs-surveys/cbp/technical-documentation/methodology.html) describes the program’s covered business population and limitations. CBP excludes self-employed people, crop and animal production, most government employment, railroads, and private households. Establishments are work locations and may not correspond one-to-one with distinct companies. This extract does not establish specific pay, a vacancy, or a particular employer’s identity.
