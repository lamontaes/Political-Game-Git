# research-deep-past-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-P15-partnership-model

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-partnership-model`); confidence low.
- Recommended: `{"PR":"read ACS 1-year Puerto Rico table directly","GU_VI_AS_MP":"read 2020 Island Areas census tables","fallback":"current national fallback until tables are loaded"}`
- Low / high: `null` / `null`; unit: rule
- Tag: ESTIMATED
- Basis: The Census API now requires a key (every query redirected to missing_key), so no ACS or Island Areas figure could be fetched. The structural fix (read Puerto Rico's own ACS row; use Island Areas tables for the other four territories) is unchanged, but there is no sourced value and the earlier territory indexes are withdrawn.
- Sources fetched (0):
- builderNote: Add a Census API key or download the ACS B12001/B11001 and 2020 Island Areas tables, then replace the territory-reads-nation fallback.

### SG-P8-civic-inputs

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-civic-inputs`); confidence low.
- Recommended: `"estimate: use current NCES/IPEDS directory with an era flag until historical directories exist"`
- Low / high: `null` / `null`; unit: data vintage
- Tag: ESTIMATED
- Basis: No source gives historical directories of meeting access; NCES CCD/IPEDS identify institutions only. Reasonable estimate: treat school and campus meeting space as available by request in the current era and mark pre-2000 as unknown-then-sampled using current institution density. This is a data-sourcing gap rather than a parameter, so evidence here is limited to the CEV participation rates for how often meetings are used.
- Sources fetched (1):
  - AmeriCorps and Census Bureau, Civic Engagement and Volunteering Supplement 2023 headline report (formal volunteering 28.3%; neighbor helping 54.2%), 2024 — https://americorps.gov/sites/default/files/document/2025-01/CEV2023_HeadlineReport_12192024_508.pdf — "28.3% of the U.S. population age 16 and up formally volunteered"
- builderNote: Add an era field to each institution rule and keep permission as not-established until an era-specific record is added.

### SG-P8-deep-past

- Feeds: src/core2/data/deep-past.json school cohorts and src/core2/deep-past.ts.
- Recommended: ESTIMATED continuity band for school institutions: the count of US public schools was 98,817 in 2009-10 and 98,577 in 2020-21 (a 0.2% drop), so present-day campuses are a close stand-in for the last decade; before 2010 no figure was found, so past campuses stay a labeled proxy with a spread of 0.8 to 1.2 times today's count for the 1980s and 1990s (estimate, derived from the 11-year stability only). Grade stages (K-5, 6-8, 9-12) stay as registered.
- Low / high: 0.998 (2010 to 2021 observed ratio 98,577 / 98,817) with the 0.8 to 1.2 estimate band for earlier eras.
- Unit: ratio of institutions to today's count.
- Tag: ESTIMATED.
- Sources:
  - NCES, Fast Facts: Public school count, 2022 — https://nces.ed.gov/fastfacts/display.asp?id=84 — "The number of public schools in 2009–10 was 98,817"; "the number of public schools in 2020–21 was 98,577."
- builderNote: Keep names and campuses as present identities, add the continuity ratio as a registered ESTIMATE, and read the CCD open year per school (if the CCD file has it) to drop schools that did not exist yet.

### SG-P15-kin-light-past

- Feeds: src/core2/deep-past.ts (husk-tier kin).
- Recommended: mechanic, builder. Generate a relative's deep past when the game first simulates them (promotion from husk tier), with the same deep-past rules residents use, seeded from the world so the same relative comes back every time. No number to source.
- Low / high: not a number.
- Tag: mechanic.
- Sources: none needed (AGENTS.md "Two-level population": nobody gets a full past until filled in, and a filled-in person must match the records).
- builderNote: Move the call to the husk-to-resident promotion path; test that promoted kin match their recorded family and move facts.

### SG-P8-opening-peer-network

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-opening-peer-network`); confidence low.
- Recommended: `"keep group size 20; recognition about 0.9 within 15 years of leaving school, about 0.7 near 50 years"`
- Low / high: `0.6` / `0.95`; unit: probability a cohort peer is still recognized by name
- Tag: ESTIMATED
- Basis: Class-sized groups average 17 to 22 (NCES), which supports peer group size of 20 for acquaintance. Recognition memory for classmates is high for a long time: about 90% name recognition up to about 15 years after graduation and roughly 60 to 80% after about 47 years (Bahrick 1975, secondary summaries disagree). So generated acquaintance can persist with recognition probability falling from 0.9 to about 0.7 across adulthood. Close friendship needs far more time (Hall 2018: about 50 hours casual, 200+ close), so most generated peers should be acquaintances, not friends. Note: some figures here come from sources not fetched this session (marked retrieved:false); treat as estimate.
- Sources fetched (2):
  - NCES, NTPS 2020-21 average public school class size, 2021 — https://nces.ed.gov/surveys/ntps/estable/table/ntps/ntps2021_fl07_t1n — "average class size 17.1 to 22.0 across school levels"
  - Journal of Social and Personal Relationships (Hall) / KU release, How many hours does it take to make a friend?, 2018 — https://news.ku.edu/news/article/2018/03/06/study-reveals-number-hours-it-takes-make-friend — "more than 200 hours before you can consider someone your close friend"
- builderNote: Add recognition decay: p = 0.9 up to 15 years since cohort, falling linearly to 0.7 at 47 years; mark peers acquaintance-only unless shared hours exceed Hall's thresholds.

### SG-P15-opening-profile

- Feeds: src/core2/opening-profile.ts education and faith at the opening.
- Recommended: mechanic, builder: derive attainment from the person's own schooling history (deep past) and faith from upbringing, then check totals against ACS B15001 by state, age and sex and the Pew Religious Landscape Study. Numbers not obtained this session: the Census QuickFacts page and the Pew executive summary returned 403, and the ACS API needs a key. The Pew study page confirms the source: surveys of "more than 35,000 Americans in all 50 states" (2007, 2014, 2023-24).
- Low / high: unresolved; keep the current CES 2024 state shares as ESTIMATED until the check tables are loaded.
- Unit: share of adults by state, age band.
- Tag: mechanic (check data unresolved).
- Sources:
  - Pew Research Center, Religious Landscape Study, 2023-24 — https://www.pewresearch.org/religion/religious-landscape-study/ — "surveys more than 35,000 Americans in all 50 states" (national shares are on the database page, not fetched).
- builderNote: Needs a researcher with a Census API key for B15001 (state, age, sex) and Pew's database export; the builder can wire the schooling-history derivation now.
