# research-residents-sourced-parameters

Oct 20 pool-feeder research for three residents rows. Employment and cadence were researched with pages fetched this session; district placement reuses the Oct 19 estimate. County ACS tables (B23001 and state legislative district tables) could not be read without a Census key.

## SG-P8-resident-employment-proxy

- Feeds: src/core2/data/resident-employment.json; parameters.json openingMissingCountyEmploymentScale
- Recommended: Keep scale 1.0 on the national age ratios (current data cites CPS 2019). Check against the latest national employment-population ratio of 59.3% (September 2026, 16 and over). County ACS B23001 needs a Census key and could not be read.
- Low / high: 0.8 (design spread) / 1.2 (design spread)
- Unit: multiplier on the national employed/population ratio by age
- Tag: ESTIMATED
- Sources:
  - Bureau of Labor Statistics, Employment Situation Table A-1 / household data — https://www.bls.gov/news.release/empsit.t01.htm — "Employment-population ratio" 59.3 (not seasonally adjusted) and 59.2 (seasonally adjusted); "Participation rate" 61.8 (September 2026)
  - Census Bureau API key requirement — noted in data/research/stopgaps-oct19/README.md ("the Census data API now requires a free key")
- Note: ESTIMATED: the 0.8 to 1.2 spread is a design range with no fetched measure of county variation; the national 2019 ratios in the data are 7 years old against 59.3% now.
- builderNote: Refresh the national ratios to the current CPS, and replace the scale with county B23001 cells when a key is available; territories keep 1.0 with the spread.

## SG-CORE-residents-cadence

- Feeds: src/core2/residents.ts
- Recommended: Bands for the counted workers: absence rate of full-time wage and salary workers 3.2% overall (private 3.0, public 4.2, retail 3.4, health care 3.8, construction 2.3); JOLTS August 2026: hires 3.3%, total separations 3.2%, quits 1.9%, layoffs and discharges 1.0% of employment per month.
- Low / high: 2.3% (construction absence) / 5.0% (federal government absence)
- Unit: percent of workers absent in the reference week; percent of employment per month
- Tag: SOURCED
- Sources:
  - Bureau of Labor Statistics, CPS Table 47, absences from work, 2025 annual averages — https://www.bls.gov/cps/cpsaat47.htm — All industries "3.2"; "Public sector": "4.2"; "Health care and social assistance": "3.8"
  - Bureau of Labor Statistics, Job Openings and Labor Turnover Summary, August 2026 — https://www.bls.gov/news.release/jolts.nr0.htm — "The hires rate was 3.3 percent in August."; "The number and rate of quits were unchanged at 3.1 million and 1.9 percent, respectively"; "layoffs and discharges changed little at 1.6 million and 1.0 percent"
- Note: These check what share of counted workers is absent or turns over in a year; mechanic of timing purchases from pay dates is builder work. CPS 2025 averages are 11-month (exclude October).
- builderNote: Mechanic plus band: builder times counted spending from pay dates and reports absence and turnover by industry against these rates.

## SG-CORE-district-placement

- Feeds: src/core2/modules/residents.ts
- Recommended: Place counted households by district order = income rank plus Gaussian noise with rank correlation 0.35 (renters 0.25) instead of strict income-order filling.
- Low / high: 0.15 / 0.6
- Unit: rank correlation between income rank and district order
- Tag: ESTIMATED
- Sources:
  - data/research/stopgaps-oct19/D-economy-world.json key SG-CORE-district-placement (confidence low) — "estimate; no source page fetched this session" (the Oct 19 basis cites Reardon and Bischoff from memory; ACS state-legislative-district tables need a Census key)
- Note: Strict income-order filling gives correlation 1, which is unrealistic; the 0.35 is the researcher's estimate.
- builderNote: Use noisy ordering with correlation 0.35; replace with ACS state-legislative-district income and tenure cells when a key is available.
