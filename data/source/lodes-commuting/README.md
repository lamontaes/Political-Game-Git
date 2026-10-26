# LODES commuting shares by place

Built by `python3 scripts/source/lodes-commuting.py` from the Census LEHD LODES8
origin-destination files (all jobs, JT00; main and aux) and each state's block
crosswalk (`stplc` is the 7-digit state and place code). Public domain (U.S.
Census Bureau). Read by `src/core2/commuting-shares.ts`.

- Vintage: the latest year LODES publishes per state, recorded under
  `source.vintageByState` (2023 for most; Alaska 2016, Michigan 2021).
- Columns per place: `liveWork` (residents whose job is in the place),
  `liveOut` (residents whose job is elsewhere, another place, unincorporated
  land or another state), `workIn` (jobs in the place held by people who live
  outside it).
- Not covered: Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and
  the Northern Mariana Islands (LODES8 publishes no files for them), so those
  places use the national average marked ESTIMATED, with the 10th to 90th
  percentile spread across places in `nationalAverage`.
- Blocks outside any Census place count as outside every place.
- sha256 of `place-commuting.json`: `64eb9eeee797f7e7df9d083c9ee53be54373960d579fbb31e7f9476435396a5f`
