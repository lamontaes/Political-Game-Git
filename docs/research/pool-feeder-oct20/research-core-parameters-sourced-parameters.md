# research-core-parameters-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-P15-distance-by-place

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-distance-by-place`); confidence medium.
- Recommended: `{"sameCounty":1.0,"sameStateOtherCounty":0.39,"farther":"unsourced estimate 0.2 (within 300 miles) and 0.1 beyond"}`
- Low / high: `0.05` / `0.5`; unit: relative visit pull
- Tag: SOURCED
- Basis: The full Pew report table shows daily contact with a parent: 56% when the parent lives in the same town versus 22% when out of town, a ratio of 0.39, which is exactly the model's out-of-county value. The tiers beyond the state have no fetched source and are estimates.
- Sources fetched (1):
  - Pew Research Center, Family Bonds full report (PDF, Table: daily contact by distance), 2006 — https://www.pewresearch.org/wp-content/uploads/sites/3/2010/10/FamilyBonds.pdf — "In same town 49 56; Out of town 8 22"
- builderNote: Keep 0.39 as the sourced out-of-town ratio (22/56); add tiers beyond the state only as labeled estimates (0.2, 0.1).

### SG-CORE-past-undated-law-age

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-CORE-past-undated-law-age`); confidence low.
- Recommended: `{"byPolicyType":{"recent_policy_domains (cannabis, paid leave, red-flag, data privacy)":{"low":1,"median":6,"high":15},"mature_policy_domains (tax structure, right-to-work, no-fault divorce, sales tax)":{"low":10,"median":35,"high":75}},"rule":"draw from a lognormal truncated to the type's low..high"}`
- Low / high: `1` / `75`; unit: years before opening
- Tag: ESTIMATED
- Basis: The 1-20 year uniform cap cannot represent settled law (many state tax structures and right-to-work laws date from the 1930s-1970s). No NCSL page was fetched, so the type-level medians and ranges are my estimates from general knowledge of adoption waves; low confidence.
- Sources fetched (0):
- builderNote: In past/parameters.json set pastUndatedLawAgeYearsHigh by policy type per this table; replace with actual enactment years from NCSL and state code histories.

### SG-P8-work-time-reserve

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-work-time-reserve`); confidence medium.
- Recommended: `8.76`
- Low / high: `8.4` / `9.03`; unit: hours of sleep reserved per workday
- Tag: SOURCED
- Basis: This file already uses the ATUS 2025 all-days sleep mean (9.03 h, from the file's own citation), with weekdays at 8.76 and weekends and holidays at 9.68. Workdays are weekdays for most workers, so reserve 8.76 h on a workday (and 9.68 off days) instead of 9.03 flat; employed-person-on-days-worked tables should lower this a little more, but I could not retrieve them. Waking recovery should come from ATUS relaxing/leisure categories rather than a guessed duration.
- Sources fetched (1):
  - BLS, American Time Use Survey, Table 1 and Table 2 (sleep 9.03 h all days; 8.76 weekdays; 9.68 weekends), 2025 — https://www.bls.gov/news.release/atus.t02.htm — "sleeping weekdays 8.76 hours; weekends and holidays 9.68"
- builderNote: Make workSleepReserveHours day-type specific: 8.76 on workdays, 9.68 on non-workdays; replace waking-recovery guess with ATUS relaxing and leisure totals by age.

### SG-P15-speech-reception

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-speech-reception`); confidence low.
- Recommended: `{"speechImpulse":0.3}`
- Low / high: `0.1` / `0.5`; unit: life-change-scale points
- Tag: ESTIMATED
- Basis: Coppock's articles could not be read (PDF compressed), so no fetched figure. Keep speechImpulse 0.3 with its 0.1 to 0.5 spread; a search snippet suggested average ad effects under 1 point, but it was not read from a page, so it is not used.
- Sources fetched (0):
- builderNote: No change.

### SG-P15-corruption-weights

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-corruption-weights`); confidence low.
- Recommended: `"keep current values"`
- Low / high: `0.05` / `0.2`; unit: share and rate
- Tag: ESTIMATED
- Basis: DOJ and World Bank pages were not readable this session. Keep bribeShareOfStake 0.1 (spread 0.05 to 0.2) and the weights; the 3-per-100,000 target was unsourced and is withdrawn.
- Sources fetched (0):
- builderNote: No change.

### SG-P15-moves-weights

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-moves-weights`); confidence low.
- Recommended: `{"movesLifeStageScale":1}`
- Low / high: `0.5` / `3`; unit: scale and yearly share
- Tag: ESTIMATED
- Basis: The Census mobility tables did not load (page lists Excel files only; direct file 404; API needs a key). Keep scale 1 (0.5 to 3) and the repo's existing owner-hold figure; the 3.5% national share was unsourced and is withdrawn.
- Sources fetched (0):
- builderNote: No change; calibrate the scale in moves.test.ts against the ACS rates already in the repo.
