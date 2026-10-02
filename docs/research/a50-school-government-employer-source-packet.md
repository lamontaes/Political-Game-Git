# School identities can be joined; the employing government still needs evidence

The admitted source files contain a school-to-district administrative link and a district-to-Census government identity link. They also identify the parent government of dependent school systems. **None of these joins establishes which legal entity employs a school's workers.** Team6 can reuse the exact identities below, but should not turn fiscal reporting or governmental dependency into an employment assertion. A dated legal-employer relation and a saved-world school-to-source identity remain missing.

## Exact source chain

| Step                                 | Published fields and source                                                                   | What the relation establishes               |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| School → LEA                         | CCD `NCESSCH` → that school's `LEAID`; district directory `LEAID`                             | Administrative school/district identity     |
| LEA → Census fiscal system           | Census school-finance `NCESID` = CCD `LEAID`; same row's `PID6`                               | Explicit reporting-system identity          |
| Fiscal system → government inventory | School-finance `PID6` = GUS `CENSUS_ID_PID6` in `School District` or `DEP School Dist`        | Same publisher identity across two vintages |
| Dependent system → parent government | GUS `DEP School Dist.PARENT_CENSUS_ID_PID6` = `General Purpose.CENSUS_ID_PID6`, where present | Explicit governmental dependency            |

The accompanying [CSV](source-packets/a50-school-government-identity-joins.csv) has all 14,077 FY2024 finance rows, including unmatched rows. `legal_employer` is **NOT_ESTABLISHED** on every row. It retains exact source row numbers, CCD status/effective date, finance unit type/year, GUS sheet/active flag and parent IDs. `issue` marks missing or ambiguous joins; no name, location, county-area or funder match fills a gap. Identifiers remain strings, preserving leading zeros.

### Measured coverage

The committed inputs have 19,484 CCD LEAs and 101,333 CCD school rows. The finance file has 14,077 distinct NCESIDs and 14,077 distinct PID6s: neither identifier is duplicated in this file.

- 12,005 finance rows match the GUS independent-school-government sheet.
- 1,177 match the dependent-school-system sheet; 41 of their parent IDs lack a matching General Purpose row.
- 895 have no matching GUS school-system row, and 129 lack a CCD LEA row. These defect counts overlap and must not be summed as disjoint groups.
- 13,070 rows have a complete, unambiguous **administrative identity** chain. Their LEAs cover 89,412 CCD schools in 48 state/D.C. codes. This is not national legal-employer coverage, a count of active employers or acceptance of the date relationship.

The source school directory covers 54 of the game's 56 places plus Bureau of Indian Education (`BI`) rows; Alaska and Rhode Island are absent from this preliminary school file. No complete administrative chain is measured for Alaska, Hawaii, Rhode Island or the five territories. Missing rows stay explicit.

## Existing admitted records to reuse

The compiler already sets `nces-sch:<NCESSCH>` and `nces-lea:<LEAID>` and reads the school's `LEAID` into `parentDistrictId` ([education compiler](../../src/source/domains/education/index.ts), lines 109–125). The compact transport retains the parent ID at tuple index 7, dated status at index 10, evidence at index 13 and source year at index 14 ([compact schema](../../src/education/compact.ts), lines 24–46). Each evidence item identifies artifact, SHA-256, CSV member and source row.

The GUS General Purpose parser uses exact six-digit publisher IDs and retains as-of/evidence metadata ([published parser](../../src/source/domains/government-units/published-2025.ts), lines 50–108). Its existing canonical simulation catalog contains county, municipality and township identities; it does **not** admit independent school districts as a new government type ([government identities](../../src/simulation/government-units.ts), lines 34–50). This packet proposes no type/schema extension.

The higher-education writer has a durable `edu-path7:institution:<institution.id>` organization stable key and preserves source evidence ([study provider](../../src/education/study-provider.ts), lines 350–365). That is a college representation, not an NCES K–12 school/district employer binding. The K–12 stage writer creates world organizations from a school/stage stable key and local names ([school stages](../../src/simulation/school-stages.ts), lines 768–779). The town-employment writer similarly creates a workplace organization from its town/workplace key ([town employment](../../src/simulation/living-world/town-employment.ts), lines 1326–1348). No inspected writer records an `NCESSCH` or `LEAID` for those generated organizations. Matching their names or locations would invent the missing relation.

**Replaces:** a proposed name/location/funder join with existing publisher IDs and existing canonical organization/enrollment/profile readers. The raw source chain is a reusable identity inventory; it does not replace Team6's producer or Audit's shared record contract.

## Exact source evidence and dates

1. **CCD:** artifact `ccd-2024-25-preliminary`, SHA-256 `960a1e788a32677cc16399b62fdc7061a830b6d8b8b90b05b875fd50fad27cd1`, committed `data/source/education/raw/ccd-2024-25.zip`. Members `ccd_sch_029_2425_w_0a_051425.csv` and `ccd_lea_029_2425_w_0a_051425.csv`; school year 2024–25, preliminary v0a. `UPDATED_STATUS` and per-row `EFFECTIVE_DATE` describe directory status, not employment or government-parent validity. The manifest's `asOf=2024-07-01` is a corpus selection anchor, not evidence that all later status facts were already true on that date.
2. **School finances:** committed `data/source/school-finances/raw/elsec24.txt.gz`; [published FY2024 file](https://www2.census.gov/programs-surveys/school-finances/tables/2024/secondary-education-finance/elsec24.txt). All measured rows have `YRDATA=24`. Published-file SHA-256 `89757cb6955ccce1224acefcec46fd3e7e02c8f5d5bdae7127516e0299baf211`; committed-gzip SHA-256 `34fbe848a0086ed428788bdba803ab250b3a95b477e848e48c419aef6dbe0578`. The README states the NCES district-directory join. This file is not an employment roster or a dated legal-employer record.
3. **Government inventory:** artifact `census-gov-units-2025-listing-zip`, [publisher archive](https://www2.census.gov/programs-surveys/gus/datasets/2025/gov_units_2025.zip), archive SHA-256 `e8b17c3928fb95fa7355a1ce7795fc7de8874c64e9ac7cd9506d6a6515d953f8`; member `Govt_Units_2025_Final.xlsx`, member SHA-256 `840e8b65e5e65325c0a42fb842ea81c0491eae3abd8a41953764044ee9e2a56e`. Active inventory is June 30, 2025; publisher GMAF retrieval is August 28, 2025 and release is September 24, 2025. `Government_Units_List_Documentation_2025.pdf`, page 1, defines the dependent entity's parent ID. This is a dated snapshot, not a validity interval back to FY2024.
4. The admitted `census-pid-gid-crosswalk` separately translates PID6 to 14-digit GID; it contains no NCES key or legal-employer assertion, and its lock supplies no stated vintage. The government-finance identity/data sample includes only its first 25 sorted nonzero publisher IDs; it is not national employer coverage.

## Row-level examples for receiving

These examples use exact IDs; the names or locations are not join conditions. Row numbers include the header as row 1.

| LEA       | Finance row / PID6 | GUS sheet / row       | Sourced parent PID6 / General Purpose row         |
| --------- | ------------------ | --------------------- | ------------------------------------------------- |
| `0100270` | 2 / `100191`       | School District / 3   | None; independent-school-government identity only |
| `0405500` | 193 / `100240`     | DEP School Dist / 65  | `122739` / 705                                    |
| `0691010` | 677 / `100621`     | DEP School Dist / 84  | `161100` / 1390                                   |
| `0901110` | 1914 / `101694`    | DEP School Dist / 131 | `184662` / 2261                                   |

## Exact missing input and next producer action

Team6 retains production ownership. To bind an actual worker's employer to government, the source must identify **the legal employing entity**, its explicit NCES/Census identifier relationship, and the effective interval or stated snapshot. A governmental dependency, public funding source or physical county is insufficient. A state/district legal-employment record, payroll employer record or equally explicit authority could establish that relation; this packet found none in the admitted files.

A generated K–12 world organization also needs an admitted saved identity mapping to a specific source school/LEA. The source identity must be chosen and recorded by its owning producer, not inferred later from a school name or town. The relevant dated writer/profile contract remains Team6/Audit-owned. For independent school districts, the present simulation government identity catalog has no admitted school-district type; do not reinterpret that PID6 as its county government.

The immediate usable input is the exact source identity CSV and row locators. The remaining blocker is **legal employment, temporal reconciliation and world-organization identity**, not absence of a district ID crosswalk. No source row in this packet is authorization to redirect pay to a government funder.

## Reproduction and verification

Run the read-only [extractor](source-packets/a50-school-government-identity-extract.py) with Python and `openpyxl`. It uses committed source archives only, writes its CSV/summary under `/tmp/overflow2-a50`, retains gaps and checks duplicate IDs. Spreadsheet/CSV source rows are 1-based including the header. Extracted CSV SHA-256: `42523dab121ede3aa905f21cf9e4438378cc014d3f1365e60e07bbcedde37f39`.

Only source-packet files are added. Production, schema, source catalogs and A137/A151 branches are preserved. No behavioral test, LOAD, official gate or simulation-year run is needed or claimed for this inventory.
