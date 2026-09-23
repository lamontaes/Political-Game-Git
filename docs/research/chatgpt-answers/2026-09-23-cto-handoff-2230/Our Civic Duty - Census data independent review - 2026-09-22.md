# Census place-population files: data verification passed with one geography exception

**Lead.** The 50-state-plus-D.C. file matches every row selected from Census Vintage 2025 SUMLEV 162. The Puerto Rico file matches all 78 municipio estimates and their Census FIPS codes. Urban Honolulu CDP is the only CDP in the first file; it is explicitly labeled as an exception. No CSV correction is indicated by this review.

## Checks

| Check | Result |
|---|---|
| Main file count and identifiers | PASS: 19,483 data rows; 19,483 unique seven-character GEOID values; state FIPS always two characters; place FIPS always five characters. Leading zeroes are retained. No blank cells. |
| Main file source fidelity | PASS: downloaded the embedded official Census `sub-est2025.csv` source and independently selected rows with `SUMLEV=162`. All 19,483 output GEOIDs, names, state names, population values and SUMLEV values match exactly. The file's estimate field is the source `POPESTIMATE2025`, the July 1, 2025 value. [Official Vintage 2025 source](https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv); [Census dataset description](https://www.census.gov/data/datasets/time-series/demo/popest/2020s-total-cities-and-towns.html). |
| Zero and CDP check | PASS: exactly four source/output population values are numeric zero: Carbonate, Colorado (`0812030`); South Park View, Kentucky (`2172138`); Corning, Missouri (`2916462`); and Mule Barn, Oklahoma (`4049860`). No other row in the file is labeled CDP; Urban Honolulu, Hawaii (`1571550`), is the only CDP. Its exception label correctly prevents it from being represented as an incorporated place. Census states Hawaii has no Census-recognized incorporated places and that Honolulu is not separately shown as a city. [Census geography glossary](https://www.census.gov/programs-surveys/geography/about/glossary.html). |
| Puerto Rico file count and identifiers | PASS: 78 municipios; 78 unique five-character municipio GEOIDs; state FIPS `72`; county/municipio FIPS retained as three-character strings; no blank cells. |
| Puerto Rico populations and codes | PASS: all 78 names and July 1, 2025 estimates match Census' `PRM-EST2025-POP` workbook. All 78 state/county-FIPS pairs match Census' Vintage 2025 all-geographies workbook at Summary Level 050. Spot checks: Adjuntas `72001`, `17,994`; Aguada `72003`, `37,319`; Aguadilla `72005`, `53,219`; Aguas Buenas `72007`, `22,838`; Aibonito `72009`, `24,746`; San Juan `72127`, `329,737`. [Census municipio workbook](https://www2.census.gov/programs-surveys/popest/tables/2020-2025/municipios/totals/prm-est2025-pop.xlsx); [Census Vintage 2025 FIPS workbook](https://www2.census.gov/programs-surveys/popest/geographies/2025/all-geocodes-v2025.xlsx). |

## Interpretation and report check

Vintage 2025 is the latest full Census estimates vintage. Census' schedule gives city/town and Puerto Rico municipio estimates through July 1, 2025 and lists the next releases in 2027. [Census vintage page](https://www.census.gov/data/datasets/time-series/demo/popest/2020s-total-cities-and-towns.html); [Census schedule](https://www.census.gov/programs-surveys/popest/about/schedule.html).

The accompanying research note correctly separates Puerto Rico municipios from incorporated places and calls out Urban Honolulu as the SUMLEV 162 CDP exception. Its data findings are sound. The current report checker flags three style errors: a raw date at line 7 and sentences over 45 words at lines 7 and 21; it also flags a dense code reference at line 17. The parent has already identified these for style repair. I do not recommend altering the underlying CSVs.

**Review date:** September 22, 2026. The spot checks above used the official source workbooks directly. No edits to the data files or repository were made.
