# Group quarters by locality

`census-2020-group-quarters.json` holds, for every locality key the game can draw in all 56 places, how many people lived in group quarters on April 1, 2020, by major type: correctional facilities for adults, juvenile facilities, nursing facilities, other institutional facilities, college or university student housing, military quarters and other noninstitutional facilities. It is research for the pool item `world-group-quarters-research` and feeds `core-group-quarters-population`, which houses these residents outside the rental market.

Regenerate it with `node --import tsx scripts/research/compile-group-quarters.ts <downloads>` (add `--check` to confirm the committed file is current). `<downloads>` is a folder outside the repository holding the files below. `scripts/research/group-quarters.test.ts` checks the file.

## Pages fetched (Nov 1, 2026)

- 2020 Census Redistricting Data (Public Law 94-171) Summary File, one zip per state, D.C. and Puerto Rico, saved as `pl/<xx>2020.pl.zip`: https://www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/ (folders `Alabama/` to `Wyoming/`, `District_of_Columbia/`, `Puerto_Rico/`).
- Its technical documentation, for table P5 (file 03, cells P0050001 to P0050010) and the geographic header's field order: https://www2.census.gov/programs-surveys/decennial/2020/technical-documentation/complete-tech-docs/summary-file/2020Census_PL94_171Redistricting_StatesTechDoc_English.pdf
- 2020 Island Areas Censuses Demographic and Housing Characteristics Summary File, saved as `ia/<xx>2020.dhc.zip` (`as`, `gu`, `mp`, `vi`): https://www2.census.gov/programs-surveys/decennial/2020/data/island-areas/ (each area's `demographic-and-housing-characteristics-file/`).
- Its technical documentation, list of tables and table matrixes, for table P28 (segment 12; after P26 and P27 in Guam, the Northern Mariana Islands and the U.S. Virgin Islands, first in American Samoa): https://www2.census.gov/programs-surveys/decennial/2020/technical-documentation/island-areas-tech-docs/dhc/
- 2025 TIGER/Line place boundaries, saved as `tiger/tl_2025_<ss>_place.zip`: https://www2.census.gov/geo/tiger/TIGER2025/PLACE/
- ACS 2020-2024 5-year table B26001, total group-quarters population, saved as `acs/acsdt5y2024-b26001.dat`: https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b26001.dat

The 2025 Gazetteer places file the game's locality list comes from is already in the repository (`data/source/places/raw/2025_Gaz_place_national.zip`).

## How each row is found

Each row is `[key, table, total, adultCorrectional, juvenile, nursing, otherInstitutional, college, military, otherNoninstitutional]`.

- **P5, SOURCED (31,764 localities).** The 2020 P5 row for the place. P5 is also published for every block, so the script checks each place against its 2025 boundary: the 2020 blocks whose internal points lie inside it must hold exactly the same residents, type by type. 33 places drawn under a new code since 2020 take the 2020 row of the same place under its older code (the same ANSI code, or the same land: a renamed Army post, a township that became a municipality), listed under `renamed`. Each passed the same block check.
- **P28, SOURCED (158 island-area villages).** Table P28 of the Island Areas file gives group quarters by sex, age and the same seven types for every village and county subdivision; the script sums the six sex-and-age groups. No island-area count needed an estimate.
- **blocks, ESTIMATED (586 localities).** 465 places drawn since 2020 and 121 whose boundary has moved across group quarters since 2020 (a city that annexed a prison or a campus). The row is the 2020 P5 count of the blocks inside the 2025 boundary. Each is listed under `estimated` with its spread, from the lowest to the highest of that count, the place's 2020 row and the ACS estimate plus or minus its margin of error.

## Results

- Storrs, Connecticut (key 0973980), P5 row as fetched: `PLST|CT|000|03|0004177|11452|73|0|0|73|0|11379|11378|0|1`. Of its 15,979 residents, 11,452 lived in group quarters: 11,378 in college housing, 73 in nursing facilities and 1 in other noninstitutional quarters.
- The 50 states and D.C.: 8,239,016 in group quarters (adult correctional 1,967,297; juvenile 88,115; nursing 1,627,046; other institutional 70,943; college 2,792,097; military 328,372; other noninstitutional 1,365,146). Puerto Rico: 37,509. American Samoa: 974. Guam: 4,392. Northern Mariana Islands: 1,307. U.S. Virgin Islands: 2,255.
- About 6.84 million group-quarters residents of the 50 states, D.C. and Puerto Rico live inside a drawable place; the rest live outside any Census place (a rural prison, a base outside town).

## Cross-check against the ACS

ACS 2020-2024 B26001 (a five-year sample average) against the 2020 P5 total, for every P5 place the ACS also publishes:

- Nation: 8,200,068 against 8,239,016 (0.995).
- Places with at least 1,000 in group quarters (1,219): the median ACS count is 0.990 of P5; 80% agree within a quarter, 96% within half.
- Places with at least 5,000 (229): median 0.968; 88% within a quarter.
- Places with at least 100 (5,439): median 1.008; 71% within a quarter.
- Places with none in 2020 (19,160): the ACS also shows none in 93%.
- Storrs: 10,929 plus or minus 249 against 11,452 (0.954).

## Limits

- A count on April 1, 2020, during the pandemic. College students were counted at their campus housing under the residence rule even where they had gone home.
- Below the state level the 2020 tables carry disclosure-avoidance noise, so a small place can show a few residents in a type it has no facility of.
- The state PL files are Latin-1, not the UTF-8 their documentation names; the script reads them as Latin-1.
