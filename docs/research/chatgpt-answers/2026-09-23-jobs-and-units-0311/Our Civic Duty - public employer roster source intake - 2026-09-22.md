# Census government listings support public-organization names in 50 states and D.C., not the territories

The Census Bureau's 2025 Government Units Listing offers a useful set of named public-organization candidates for the 50 states and D.C. It does not cover Puerto Rico or the four Island Areas. Territory-specific official directories can fill some name and location gaps, but there is no single comparable Census roster across all five territories. These sources can support an organization identity and its listed address; none establishes a current vacancy, a specific job offer, or the exact workplace for a particular employee.

## What the 2025 listing contains

The [Census 2025 Government Units Listing page](https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html) publishes the annual listing on September 24, 2025. Its [official ZIP](https://www2.census.gov/programs-surveys/gus/datasets/2025/gov_units_2025.zip) contains an Excel workbook and a documentation PDF. The [Census annual public-use-files page](https://www.census.gov/programs-surveys/gus/data/publicusefiles.html) describes this series as public-use files of U.S. state and local governments.

I inspected the 2025 workbook's five sheets: General Purpose, Special District, School District, DEP School Dist, and Public Pension Sys. The `STATE` field in all five sheets contains the 50 state abbreviations and D.C.; it contains no Puerto Rico, American Samoa, Guam, Northern Mariana Islands, or U.S. Virgin Islands records. This is a verified coverage gap in this file, not evidence that those governments do not exist. The [2025 Census geography reference page](https://www.census.gov/geographies/reference-files/2025/geo/geo-reference-files.html) separately lists all five territories for geographic names/codes, but geographic coverage is not an employer or government-unit roster.

The workbook provides usable candidate identifiers and descriptive fields. Across its sheets, these include Census PID6, unit name and type, government function for special districts, mailing/location address fields, city, state, ZIP, website, and selected population or enrollment data with source years. General-purpose units also carry county/state FIPS fields; special districts and other sheets have their own field layouts. Keep IDs as strings so leading zeros are preserved. A field not present on a given sheet is not an unknown value to be imputed from another sheet.

The listing can support a sourced display name and a coarse listed location after checking the relevant row and location. It does not say that the listed address is a staffed worksite, where a particular job is performed, whether the government is hiring, what it pays, or which person works there. It is a 2025 roster snapshot; recheck current official status before presenting the name as current in a later simulation year. Do not treat every listed special district or pension system as a conventional workplace available to a player.

## Territorial supplements and remaining limits

| Jurisdiction | Official source that can support named organizations | What it supplies and what remains unknown |
|---|---|---|
| Puerto Rico | [PR.gov agency directory](https://pr.gov/gobierno-2/agencias) | Lists Commonwealth agencies and public authorities; its current page also provides a region/town filter. The page is not a complete census of all municipalities, boards, public corporations, or local employers. Stable, comparable government-unit IDs and a complete 2025 roster remain **UNKNOWN**. |
| Guam | [Official Guam Government Directory](https://www.guam.gov/gov-guam-directory/) and the Governor's [2026 Protocol Directory](https://governor.guam.gov/adelup-offices-directory/) | The portal lists departments, authorities, boards, utilities, and other bodies. The Governor's directory page announces a 2026 directory and provides office-level contact information. A stable cross-agency ID system and a complete, machine-readable listing of every local public employer remain **UNKNOWN**. |
| Northern Mariana Islands | [CNMI Office of Planning and Development Government Directory](https://opd.gov.mp/directory.html) | Lists central-government officials, departments, some autonomous agencies, and some municipal officials with office and address fields; its linked PDF is dated July 24, 2025. It expressly covers only central government and some autonomous agencies, so completeness across local units and current names beyond that date remain **UNKNOWN**. |
| American Samoa | [American Samoa Department of Commerce](https://doc.as.gov/about) and [Department of Legal Affairs](https://www.legalaffairs.as.gov/) | Official department pages identify the agency and listed Pago Pago/Fagatogo-area address; Legal Affairs describes constituent offices. These are agency pages rather than a single complete roster. A common stable ID, full agency inventory, and sub-territory workplace coordinates remain **UNKNOWN**. |
| U.S. Virgin Islands | [Office of the Lieutenant Governor: Links and Resources](https://ltg.gov.vi/about-us/link-resources/) | Lists executive-branch departments and semi-autonomous agencies. The page identifies organizations but does not provide a complete cross-branch roster with consistently structured island/location fields or stable IDs. Those remain **UNKNOWN**. |

These directory links are direct government sources, not statistical evidence of staffing. The [Census 2025 geography names and codes](https://www.census.gov/geographies/reference-files/2025/geo/geo-reference-files.html) can help normalize a territory or place label when the directory supplies one, but should not be used to infer an employer or precise worksite.

## Safe use in the Jobs research

- Use an exact, current agency or government name from its own roster as an organization candidate. Preserve the source's spelling and identify the government level when the source states it.
- Use only listed address or city fields as approximate organization-location evidence. A mailing address is not a verified job site, a service territory, or an employee's commute destination.
- Keep the Census PID6 as a source identifier when present, not as a game person, vacancy, or employer ID. Do not invent an equivalent identifier for territory listings.
- Do not infer payroll size, open positions, pay, hours, hiring likelihood, or that an organization employs a character. Those facts require another source or simulation record.
- Keep the territory roster gap visible. The territories need separate source-backed organization records; the 2025 Census workbook's absence cannot be converted into zero public employers.

## Sources and method

Official source review and direct workbook inspection were completed September 22, 2026. The primary file is the [Census 2025 Government Units Listing](https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html). I inspected all five workbook sheets and compared their `STATE` values with the 50 state abbreviations, D.C., and the five territories. The territory directory examples above were checked on their issuing government websites. No organization data were imported into the game, and no vacancies or employee records were inferred.
