# State and local government finances by state, 2022 (Census Bureau)

`22slsstab1.xlsx` is the Census Bureau's table of state and local government
finances by level of government and state for fiscal 2022, a Census of
Governments year, so it's a full count, not a sample. For each state and
D.C. it gives revenue by source (taxes by kind, charges, federal aid) and
spending by function (education, public welfare, hospitals, highways,
police, fire, corrections, parks, interest and more). It gives these for
state and local governments combined, the state alone, and local
governments alone.

- Source: https://www2.census.gov/programs-surveys/gov-finances/tables/2022/22slsstab1.xlsx
- Retrieved: 2026-09-28, on the Mac for Lane F, whose cloud session can't reach census.gov
- SHA-256: 4dd123c5ad520e33d9692f622d389a020e2d3a7e6e782763663854dd84643b9b

It calibrates each generated government's opening budget (04 SYSTEM SPECS,
section 9). The game generates its own budgets; this table never sets them
directly. The territories aren't in it: they stay UNKNOWN or use their own
sources.

## 22statetypepu.txt: 2022 estimates by state and level, by item code

`22statetypepu.txt` is the Census Bureau's public-use file of 2022 finance
estimates by state and level of government (state, local, county, city,
township, special district, school district) for every finance item code, in
thousands of dollars. It sits in the 2022 individual unit file archive.
`2022-public-use-technical-documentation.pdf` is the archive's technical
documentation, with the item codes and their descriptions.

- Source: https://www2.census.gov/programs-surveys/gov-finances/tables/2022/2022_Individual_Unit_File.zip
- Retrieved: 2026-10-15, from the cloud session that built `scripts/research/export-service-charges-2022.py`
- SHA-256 of `22statetypepu.txt`: c6b7e9dbbe6db22b946ee5d278d62e56950073856a550eb9b7f862f515cebd26

It tells what current charges and miscellaneous general revenue are for
(`data/research/money/service-charges-2022.json`). The unit-level files in the
same archive (45 MB and 13 MB) are not kept here.
