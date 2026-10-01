# ACS place housing structure

Official U.S. Census Bureau 2020–2024 ACS 5-year summary tables B25034
(Year Structure Built) and B25024 (Units in Structure), universe Housing units.
`artifact-lock.json` records original download URLs, vintage, original byte
length/SHA-256 and compressed SHA-256. The raw gzip artifacts reproduce the
complete downloaded bytes; the table shells preserve exact labels.

Reproduce from the repository root:

```sh
node --import tsx scripts/source/regional-money/compile-place-housing-structure.ts
node --import tsx scripts/source/regional-money/compile-place-housing-structure.ts --check
```

The generated module matches the actual national place roster by exact
seven-digit place GEOID. No county, state or national substitution occurs.
An absent exact place row is a null table. Unavailable/suppressed cells are
null, with their original source tokens retained in the locked raw artifact.
ACS does not cover American Samoa, Guam, Northern Mariana Islands or the
U.S. Virgin Islands; this is explicit in metadata even though the current
national place roster does not contain their places. Puerto Rico is included.

The two marginal tables do not establish a joint year-by-structure distribution.
They count housing units, not buildings. Estimates and their published margins
of error remain paired. Finite source bands have inclusive bounds. Open source
bands retain a null unbounded endpoint, including 1939 or earlier, 2020 or later,
and 50 or more. Mobile home and Boat, RV, van, etc. retain unknown unit-count
bounds. This source-only artifact makes no sampling or outcome decisions.
