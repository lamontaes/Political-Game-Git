# research-core-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-P15-closeness-model

- Feeds: src/core2/data/closeness.json (half-closeness point in hours, fade half-life, visits-per-year stand-ins).
- Recommended: half-closeness point (hours together at which closeness is 0.5): 164 hours for a friend tie (adult sample), with category thresholds 94 h casual friend, 164 h friend, 219 h best friend; student sample thresholds 43 h, 57 h and 119 h. Fade half-life: ESTIMATED 1.0 year without contact (no measure of the decay rate in time was found; Roberts and Dunbar 2015 give the direction and the 18-month design only). Opening visits per year by GSS category stay as registered.
- Low / high: half-closeness 57 h (student friend threshold) to 219 h; half-life 0.5 to 2 years.
- Unit: hours; years.
- Tag: SOURCED (hours), ESTIMATED (half-life).
- Sources:
  - Hall, J. A., How many hours does it take to make a friend? (J. Social and Personal Relationships, 2019), summarized by Simply Psychology — https://www.simplypsychology.org/news/how-many-hours-does-it-take-to-make-a-friend/ — "approximately 94 hours of shared contact"; "roughly 164 hours"; "a true best friendship demanded 219 hours of cumulative interaction"; students: "just 43 hours", "57 hours", "119 hours".
  - Roberts and Dunbar, Managing Relationship Decay, Human Nature 26(4), 2015 (web-search summary; the Oxford abstract page returned 403) — "The decline in friendship quality was mitigated by increased effort invested in the relationship" (direction of decay only).
- builderNote: Set the half-closeness point from the adult friend threshold; keep the half-life a TUNABLE tagged ESTIMATED with the 0.5 to 2 year spread; per-pair opening histories come from the shared past (mechanic).

### SG-P8-emotion-model

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-emotion-model`); confidence low.
- Recommended: `"keep affine appraisal with exponential recovery; mood half-life 1 d, stress half-life 3 d, add slower rumination component"`
- Low / high: `null` / `null`; unit: model structure
- Tag: ESTIMATED
- Basis: Affect literature supports exponential-like return to baseline for most emotions with median episode durations of hours and long tails for sadness (about 120 hours) and ruminated events (Verduyn 2015); daily-diary studies show partial next-day carryover (Leger 2018). Adult trajectories can be checked against PSS-10 norms (mean about 12.8 of 40, SD 6.42; Klein 2016). The affine structure is adequate; the gap is a slow component (rumination, chronic burden) which is currently only carried by baselines. Note: some figures here come from sources not fetched this session (marked retrieved:false); treat as estimate.
- Sources fetched (2):
  - Psychological Science (Leger, Charles, Almeida), Let It Go: Lingering negative affect in response to daily stressors is associated with physical health years later, 2018 — https://journals.sagepub.com/doi/10.1177/0956797618763097 — "negative emotional responses to stress carry over to the following day"
  - BMC Psychiatry (Klein et al.), Psychological stress in the German general population: PSS-10 norm values, 2016 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4877813 — "overall mean 12.57, SD 6.42 (Table 3 total score)"
- builderNote: Keep emotion.ts structure; update half-lives as above, and add an optional second slow decay (half-life 14 to 30 days) for events flagged ruminated or chronic.

### SG-P15-free-block-plan

- Feeds: src/core2/free-block.ts daily time budget and the reserved ATUS time of activities the game does not model.
- Recommended: mechanic, builder. A complete daily budget: 24 hours minus sleep minus the work, care and household acts the game models, with the remainder reserved for unmodeled categories. ATUS 2025 all-person averages (hours per day): sleeping 9.03; household activities 1.99; caring for and helping household children and parents 1.36; working, employed persons 5.02 (7.66 on days worked); leisure and sports 5.16; eating and drinking 1.21.
- Low / high: use ATUS by age and employment group for spread (Table 1 and 2 not fetched whole this session); proof band: weekly totals within 20% of ATUS per group (Oct 19 SG-P8-life-utility note).
- Unit: hours per day.
- Tag: mechanic (numbers SOURCED).
- Sources:
  - BLS, American Time Use Survey latest numbers, 2025 — https://www.bls.gov/tus/latest-numbers.htm — "Sleeping: 9.03 in 2025"; "Household activities: 1.99 in 2025"; "Caring for and helping household children, parents: 1.36 in 2025"; "Working, employed persons: 5.02 in 2025"; "Leisure and sports: 5.16 in 2025"; "Eating and drinking: 1.21 in 2025"; "Working on days worked, employed persons: 7.66 in 2025".
- builderNote: Make needs evolve on each planned day from their own causes and save plans with the world; reserve time for unmodeled ATUS categories; reuse the SG-P8-life-utility weights from the Oct 19 file.

### SG-GOV-policy-power-conditions

- Feeds: src/core2/policy-authority.ts (the authority reader) and data/research/powers-catalog/.
- Recommended: mechanic, builder. Express each qualitative condition on a limited power as a structured predicate the authority reader evaluates before a bill or executive order. Territory cells inherit the state cell (data/research/powers-catalog/territory-grant.json, tag ESTIMATED); read each territory's organic act or constitution cell by cell (existing pool item laws-territory-powers-research).
- Low / high: not a number.
- Tag: mechanic.
- Sources (from the repository file, read Oct 20): territory-grant.json cites 48 U.S.C. 1423a (Guam), 48 U.S.C. 1574(a) (USVI), and the Northern Marianas Commonwealth constitution; Guam text: "The legislative power of Guam extends to all rightful subjects of legislation not inconsistent with the Organic Act and the laws of the United States applicable to Guam."
- builderNote: No new number to source; add a predicate list per limited cell and test it through the same reader, naming the pool item for the territory reading.

### SG-GOV-recall-bars-national

- Reused from `data/research/stopgaps-oct19/C-government-law.json` (id `SG-GOV-recall-bars-national`); confidence low.
- Recommended: `{"AL":{"localRecall":false,"hasNoRecall":true,"firstDaysBar":null,"lastDaysBar":null,"afterFailed":null,"note":"No general recall; only specific local acts; officials subject to impeachment/removal only.","c":"m"},"AK":{"localRecall":true,"hasNoRecall":false,"firstDaysBar":120,"lastDaysBar":180,"afterFailed":"not found","note":"Municipal petition needs stated grounds (lack of fitness, incompetence, neglect of duties, corruption); state-level analogue 120/180 days.","c":"l","signaturePercent":25,"circulationDays":60,"groundsRequired":true},"AZ":{"localRecall":true,"hasNoRecall":false,"firstDaysBar":183,"lastDaysBar":0,"afterFailed":"no second petition against same officer in same term unless petitioners reimburse the first election's cost","note":"VERIFIED: statute bars circulation until officer has held office six months; a new term does not restart the clock.","c":"h","signaturePercent":25,"circulationDays":120,"groundsRequired":false},"AR":{"localRecall":true,"hasNoRecall":false,"firstDaysBar":null,"lastDaysBar":null,"afterFailed":"not found","note":"Recall exists only in city-manager (35%) and city-administrator (25%) cities; no timing bar located; estimate 180-day first-term bar by analogy.","c":"l","signaturePercent":35,"circulationDays":30,"groundsRequired":false},"CA":{"localRecall":true,"hasNoRecall":false,"firstDaysBar":90,"lastDaysBar":0,"afterFailed":"none statutory; ... [truncated; full value in the Oct 19 file]`
- Low / high: `0` / `365`; unit: days (first/last-of-term bars); null = no bar found
- Tag: ESTIMATED
- Basis: 33 of 56 places have some local recall (the 92O rule pack plus PR/GU/VI/AS/MP none); 23 have none or charter-only, stated per place. Only AZ (six-month first-term bar and cost rule), WA (filing at least six months before the next general election), KS (state-officer 120/200-day bars), MT (grounds), NE (35%) and MI (reason based on current term) were read from statute pages this session; every other bar is a memory-based or analogy estimate flagged c:l/m. The national 180-day bar is only right for GA (180/180) and roughly AK (120/180).
- Sources fetched (8):
  - Arizona Legislature, Arizona Revised Statutes 19-202, 2026 — https://www.azleg.gov/ars/19/00202.htm — "until the officer has held office for six months"
  - Washington Legislature, RCW 29A.56.150 (recall time limits), 2026 — https://app.leg.wa.gov/RCW/default.aspx?cite=29A.56.150 — "not less than six months before the next general election"
  - Kansas Revisor of Statutes, K.S.A. 25-4305 (state officers), 2026 — https://www.ksrevisor.org/statutes/chapters/ch25/025_043_0005.html — "first 120 days or the last 200 days of the term"
  - Montana Legislature, MCA 2-16-603 grounds for recall, 2025 — https://leg.mt.gov/bills/mca/title_0020/chapter_0160/part_0060/section_0030/0020-0160-0060-0030.html — "are the only grounds for recall"
  - Nebraska Legislature, Neb. Rev. Stat. 32-1303, 2026 — https://nebraskalegislature.gov/laws/statutes.php?statute=32-1303 — "at least thirty-five percent of the total vote cast"
  - Michigan Legislature, MCL 168.952, 2026 — https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-168-952 — "based upon the officer's conduct during his or her current term"
- builderNote: Add firstDaysBar, lastDaysBar (number, 'before-election' for WA, or null) and afterFailed to each state's municipal recall rule; replace the 180-day/one-failed global; treat c:'l' entries as provisional and refine from statute pages.

### SG-M1-opening-pregnancies

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-M1-opening-pregnancies`); confidence medium.
- Recommended: `{"rule":"At opening, each woman aged 15-44 is pregnant with probability = (age-specific births per woman per year) x 0.75 x 1.15; national general fertility rate 53.8 per 1,000 women 15-44 gives about 4.6% of women 15-44 pregnant at a random date","generalFertilityRate2024":53.8,"gfr2025provisional":53.1,"stateScaling":"multiply by state GFR / 53.8 (NVSS state table, not fetched)"}`
- Low / high: `0.035` / `0.055`; unit: share of women 15-44 pregnant on day one
- Tag: SOURCED
- Basis: The final 2024 national general fertility rate was 53.8 births per 1,000 women 15-44 (provisional 2025: 53.1), fetched via search of NCHS. A pregnancy lasts about 0.75 year, so live-birth pregnancies in progress are about 4.0% of women 15-44; the 1.15 factor adds pregnancies ending in loss or abortion (assumed ~15%; not fetched). Age-specific rates must come from the NVSS Births report; I did not fetch them.
- Sources fetched (1):
  - CDC NCHS, Births in the United States, 2024 (NCHS Data Brief 535) and NVSS final data, 2025 — https://cdc.gov/nchs/products/databriefs/db535.htm — "final 2024 rate 53.8, decline of about 1%"
- builderNote: In renewal.ts seed opening pregnancies with Bernoulli(ASFR(age)*0.75*1.15) per eligible partnered-or-not woman, ASFR from NVSS table scaled so the mean over 15-44 = 53.8/1000; spread phase dates uniformly over the 273-day term.

