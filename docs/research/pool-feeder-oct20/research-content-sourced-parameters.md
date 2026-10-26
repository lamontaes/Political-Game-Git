# research-content-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-P8-life-utility

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-life-utility`); confidence low.
- Recommended: `"replace one-act-per-activation by an ATUS time-budget plan"`
- Low / high: `null` / `null`; unit: design/time budget
- Tag: ESTIMATED
- Basis: ATUS reports daily primary-activity totals (this file already uses sleep 9.03 h, work 8.1 h on workdays, social 1.92 h, care 2.23 h). Instead of one scored act per activation, allocate each day's waking hours across ATUS categories by age and employment, with choice weights (need 1, goal 0.8, drive 1, trait 0.6, emotion 0.35, effort 0.3) deciding which act fills discretionary slots. Cadence by tier (daily for the player circle, weekly local, monthly state) is acceptable if the weekly or monthly step draws a full period's ATUS-matched totals, not one act.
- Sources fetched (2):
  - BLS, American Time Use Survey, Table 1 and Table 2 (sleep 9.03 h all days; 8.76 weekdays; 9.68 weekends), 2025 — https://www.bls.gov/news.release/atus.t02.htm — "sleeping weekdays 8.76 hours; weekends and holidays 9.68"
  - Psychological Bulletin (Webb, Sheeran), Does changing behavioral intentions engender behavior change? A meta-analysis of the experimental evidence, 2006 — https://doi.org/10.1037/0033-2909.132.2.249 — "(d = 0.66) leads to a small-to-medium change in behavior (d = 0.36)"
- builderNote: Implement a per-period time budget by ATUS category; use the weights from these rows; test that simulated weekly totals are within 20% of ATUS by age/employment group.

### SG-P8-civic-progress

- Reused from `data/research/stopgaps-oct19/A-people-behavior-1.json` (id `SG-P8-civic-progress`); confidence low.
- Recommended: `"availability anchored to participation rates"`
- Low / high: `0.2` / `0.35`; unit: share of adults
- Tag: ESTIMATED
- Basis: In 2023 28.3% of Americans age 16 and over formally volunteered and 54.2% helped neighbors (CEV). Formal civic organization availability should let about a quarter to a third of adults per year take part; public-meeting attendance is much rarer (single digits to low teens by CEV charts, exact value not retrieved). Estimate: yearly probability of a civic act is about 0.28 for volunteering, about 0.05 to 0.10 for attending a public meeting.
- Sources fetched (1):
  - AmeriCorps and Census Bureau, Civic Engagement and Volunteering Supplement 2023 headline report (formal volunteering 28.3%; neighbor helping 54.2%), 2024 — https://americorps.gov/sites/default/files/document/2025-01/CEV2023_HeadlineReport_12192024_508.pdf — "28.3% of the U.S. population age 16 and up formally volunteered"
- builderNote: Calibrate civic availability so simulated yearly formal volunteering is about 28% of adults 16+, by state using CEV state tables; keep meeting attendance low (5 to 10%).
