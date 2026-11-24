# GUS 2025 public units: source rows for 50 states and D.C.

This extract contains all 97,241 nonblank detail rows across the five sheets in Census’s 2025 Government Units Listing workbook. It preserves the workbook’s original fields and adds only the source sheet and Excel row number. The data covers the 50 states and D.C.; the workbook contains no records for the five inhabited territories. It supplies candidate public-organization names and source-listed locations, not town assignment, staffing, openings, or job offers.

## Source and integrity

- Census product page: [2025 Government Units Listing](https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html), published September 24, 2025.
- Official archive: [2025 Government Units Listing ZIP](https://www2.census.gov/programs-surveys/gus/datasets/2025/gov_units_2025.zip).
- Archive SHA-256: `e8b17c3928fb95fa7355a1ce7795fc7de8874c64e9ac7cd9506d6a6515d953f8`.
- Workbook member: `Govt_Units_2025_Final.xlsx`; SHA-256: `840e8b65e5e65325c0a42fb842ea81c0491eae3abd8a41953764044ee9e2a56e`.
- Extract SHA-256: `976d1c8192af837271a2bbacc0dd7de9dcd6056b3f24ede92a81deccc2df6149`.
- Census describes the annual files as listings of U.S. state and local governments. The workbook sheets are General Purpose, Special District, School District, DEP School Dist, and Public Pension Sys.

## Sheet totals

| Source sheet | Rows |
|---|---:|
| General Purpose | 38,704 |
| Special District | 40,199 |
| School District | 12,535 |
| DEP School Dist | 1,318 |
| Public Pension Sys | 4,485 |
| **All sheets** | **97,241** |

## Rows by source `STATE` value

Counts use the source State column exactly. Twelve Special District records have no State value, so the extract keeps them under `<blank>`. Their source `FIPS_STATE` is `48`; the export leaves State blank rather than converting that code. Resolve the original row if an assigned state is needed.

| State | General Purpose | Special District | School District | DEP School Dist | Public Pension Sys | Total |
|---|---:|---:|---:|---:|---:|---:|
| AL | 531 | 540 | 139 | 1 | 20 | 1,231 |
| AK | 164 | 18 | 0 | 55 | 6 | 243 |
| AZ | 106 | 337 | 242 | 12 | 47 | 744 |
| AR | 575 | 734 | 231 | 3 | 60 | 1,603 |
| CA | 540 | 2,976 | 1,004 | 54 | 86 | 4,660 |
| CO | 335 | 3,539 | 180 | 0 | 59 | 4,113 |
| CT | 178 | 416 | 17 | 149 | 203 | 963 |
| DE | 60 | 255 | 19 | 0 | 25 | 359 |
| DC | 1 | 2 | 0 | 2 | 9 | 14 |
| FL | 477 | 1,596 | 95 | 0 | 460 | 2,628 |
| GA | 689 | 512 | 180 | 0 | 87 | 1,468 |
| HI | 4 | 17 | 0 | 1 | 1 | 23 |
| ID | 243 | 798 | 117 | 0 | 6 | 1,164 |
| IL | 2,821 | 3,222 | 890 | 0 | 43 | 6,976 |
| IN | 1,660 | 698 | 290 | 0 | 249 | 2,897 |
| IA | 1,041 | 452 | 341 | 0 | 9 | 1,843 |
| KS | 1,981 | 1,460 | 308 | 0 | 12 | 3,761 |
| KY | 530 | 589 | 171 | 0 | 30 | 1,320 |
| LA | 364 | 103 | 69 | 1 | 30 | 567 |
| ME | 497 | 227 | 101 | 162 | 5 | 992 |
| MD | 180 | 161 | 0 | 39 | 87 | 467 |
| MA | 357 | 415 | 85 | 235 | 104 | 1,196 |
| MI | 1,856 | 437 | 567 | 0 | 144 | 3,004 |
| MN | 2,720 | 589 | 330 | 0 | 420 | 4,059 |
| MS | 381 | 434 | 150 | 5 | 4 | 974 |
| MO | 1,337 | 1,938 | 529 | 1 | 83 | 3,888 |
| MT | 183 | 741 | 308 | 0 | 97 | 1,329 |
| NE | 971 | 1,336 | 267 | 0 | 27 | 2,601 |
| NV | 35 | 134 | 17 | 0 | 4 | 190 |
| NH | 246 | 121 | 167 | 10 | 5 | 549 |
| NJ | 585 | 220 | 521 | 72 | 16 | 1,414 |
| NM | 138 | 763 | 96 | 0 | 5 | 1,002 |
| NY | 1,581 | 1,196 | 676 | 38 | 9 | 3,500 |
| NC | 651 | 309 | 0 | 174 | 14 | 1,148 |
| ND | 1,710 | 659 | 171 | 0 | 18 | 2,558 |
| OH | 2,321 | 979 | 665 | 0 | 8 | 3,973 |
| OK | 672 | 629 | 537 | 0 | 20 | 1,858 |
| OR | 277 | 1,029 | 224 | 0 | 17 | 1,547 |
| PA | 2,623 | 1,688 | 514 | 0 | 1,553 | 6,378 |
| RI | 39 | 84 | 4 | 32 | 38 | 197 |
| SC | 317 | 264 | 76 | 0 | 9 | 666 |
| SD | 1,268 | 470 | 148 | 0 | 3 | 1,889 |
| TN | 437 | 451 | 14 | 128 | 37 | 1,067 |
| TX | 1,480 | 3,093 | 1,069 | 9 | 129 | 5,780 |
| UT | 284 | 310 | 41 | 0 | 10 | 645 |
| VT | 288 | 158 | 121 | 0 | 10 | 577 |
| VA | 322 | 197 | 1 | 132 | 32 | 684 |
| WA | 321 | 1,268 | 295 | 0 | 57 | 1,941 |
| WV | 285 | 297 | 55 | 0 | 66 | 703 |
| WI | 1,920 | 679 | 437 | 3 | 4 | 3,043 |
| WY | 122 | 647 | 56 | 0 | 8 | 833 |
| `<blank STATE>` | 0 | 12 | 0 | 0 | 0 | 12 |

## Fields and provenance

Every original column from each workbook sheet is retained in the union schema. A column that does not exist on a particular source sheet is blank in that row. `source_sheet` names the workbook sheet, and `source_excel_row` is the one-based physical Excel row including the header. No county, municipality, town, coordinate, employer, vacancy, or job field is inferred or synthesized.

- Identity fields: `CENSUS_ID_PID6`, `UNIT_NAME`, and `UNIT_TYPE`.
- Contact title and address lines: `TITLE`, `ADDRESS1`, and `ADDRESS2`.
- City, state, and ZIP fields: `CITY`, `STATE`, and `ZIP`.
- ZIP extension field: `ZIP4`.
- Website field: `WEB_ADDRESS`.
- Geographic fields: `FIPS_STATE`, `FIPS_COUNTY`, and `COUNTY_AREA_NAME`.
- Other original columns include status, political or function codes, population or enrollment with source year, school-level description, and parent-unit identifiers. Blank source values remain blank. Identifiers and geographic codes are retained as text.

`ACTIVE` and other status fields are source values, not a claim that a unit is currently hiring or that a listed address is a staffed work site. Public Pension Sys rows are included because they are a published workbook sheet; they are not automatically ordinary job locations. This is a 2025 source snapshot.

## Limits and safe use

- Use a row as evidence that Census listed a unit by that name and type in this product. Recheck the current issuing government source before treating the organization as current in a later simulation year.
- Treat address, city, ZIP, and FIPS fields as the literal fields published on that sheet. They do not establish where a particular job is performed.
- Do not infer an employer from a government-unit name, a vacancy, headcount, pay, schedule, hire likelihood, or a specific employee.
- Territory records are absent from this Census workbook. Do not interpret the absence as zero public organizations or manufacture a Census ID for territorial records.
- The 12 rows with blank `STATE` remain unassigned in the normalized `STATE` field. Although the original workbook contains `FIPS_STATE=48` on them, the CSV does not convert that code into an added state value.

## Reproducible extraction and validation

Download the official archive and confirm its hash before extraction:

```sh
curl -L 'https://www2.census.gov/programs-surveys/gus/datasets/2025/gov_units_2025.zip' -o /private/tmp/gov_units_2025.zip
shasum -a 256 /private/tmp/gov_units_2025.zip
unzip -oq /private/tmp/gov_units_2025.zip -d /private/tmp/gus2025
shasum -a 256 /private/tmp/gus2025/Govt_Units_2025_Final.xlsx
shasum -a 256 /private/tmp/ocd-gus2025-public-units-51.csv
```

Validation command using Python’s standard library (expects this CSV at the stated path):

```sh
python3 - <<'PY'
import csv, collections
p="/private/tmp/ocd-gus2025-public-units-51.csv"
with open(p, newline="", encoding="utf-8") as f:
    rows=list(csv.DictReader(f))
expected={"AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"}
assert len(rows)==97241, len(rows)
assert len({r["source_sheet"] for r in rows})==5
assert {r["STATE"] for r in rows if r["STATE"]}==expected
assert sum(not r["STATE"] for r in rows)==12
assert all(r["source_excel_row"].isdigit() for r in rows)
counts=collections.Counter(r["source_sheet"] for r in rows)
assert counts=={"General Purpose":38704,"Special District":40199,"School District":12535,"DEP School Dist":1318,"Public Pension Sys":4485}, counts
by_sheet_state=collections.Counter((r["source_sheet"],r["STATE"] or "<blank>") for r in rows)
assert by_sheet_state[("Special District","<blank>")]==12
print("PASS", len(rows), "rows; five sheets; 51 state/DC codes; 12 blank STATE rows")
PY
```

For exact row-level comparison, reopen the source workbook in read-only/data-only mode with `openpyxl`. Compare each original sheet row with the CSV row selected by the added source-sheet and Excel-row provenance columns. Those two columns are the only additions.
