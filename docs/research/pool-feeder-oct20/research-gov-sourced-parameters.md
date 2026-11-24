# research-gov-sourced-parameters: research results (Oct 20 pool feeder)

Sources: Oct 19 files in `data/research/stopgaps-oct19/` reused by id where they cover a row; the rest researched Oct 20 from pages fetched in this session. Tag SOURCED means a fetched measure; ESTIMATED means no direct measure and a stated spread; mechanic means a builder change that reads sourced inputs.

### SG-GOV-justice-bribery-grade

- Reused from `data/research/stopgaps-oct19/C-government-law.json` (id `SG-GOV-justice-bribery-grade`); confidence low.
- Recommended: `{"AL":{"cite":"Ala. Code 13A-10-61","grade":"Class B felony","minYears":2,"maxYears":20,"maxFine":30000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"AK":{"cite":"AS 11.56.100","grade":"Class B felony","minYears":0,"maxYears":10,"maxFine":100000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"AZ":{"cite":"ARS 13-2602","grade":"Class 4 felony","minYears":1,"maxYears":3.75,"maxFine":150000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"AR":{"cite":"Ark. Code 5-52-101","grade":"Class B felony","minYears":5,"maxYears":20,"maxFine":15000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"CA":{"cite":"Penal Code 67/68/86","grade":"felony (2-3-4 yr triad)","minYears":2,"maxYears":4,"maxFine":10000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"CO":{"cite":"CRS 18-8-302","grade":"Class 3 felony","minYears":4,"maxYears":12,"maxFine":750000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"CT":{"cite":"CGS 53a-147","grade":"Class C felony","minYears":1,"maxYears":10,"maxFine":10000,"c":"l","src":"recalled, NOT fetched this session; verify against statute text"},"DE":{"cite":"11 Del.C. 1203","grade":"Class F felony (est.)","minYears":0,"maxYears":3,"maxFine":7500,"c":"l","src":"recalled, N ... [truncated; full value in the Oct 19 file]`
- Low / high: `null` / `null`; unit: years / USD
- Tag: ESTIMATED
- Basis: Federal 18 USC 201 (15 years) was fetched from Cornell LII. All state and territory entries are from recall (class, range, fine) and were not fetched this session, so they are low-confidence and some cites are estimates (DE, MS, NE, RI, territories). A coder should use maxYears/minYears as defaults and verify cites before shipping.
- Sources fetched (1):
  - Cornell LII, 18 USC 201, 2026 — https://www.law.cornell.edu/uscode/text/18/201 — "imprisoned for not more than fifteen years, or both"
- builderNote: Add offense key 'bribery_public_official' to sentencing-ranges-2026.json per place using minYears/maxYears/maxFine; federal = 0-15 years.

### SG-OFFICIALS-unrecorded-party

- Reused from `data/research/stopgaps-oct19/D-economy-world.json` (id `SG-OFFICIALS-unrecorded-party`); confidence low.
- Recommended: `{"rule":"party = 2024 presidential winner's party for a statewide executive with probability 0.9 (margin >15 pts), 0.75 (5-15), 0.55 (<5), else the other major party; LG on a joint ticket = governor's party, LG elected separately (about 17 states) follows the same rule"}`
- Low / high: `0.55` / `0.97`; unit: probability
- Tag: ESTIMATED
- Basis: No roster of statewide executives was fetched (Ballotpedia not retrieved this session), so these probabilities are my estimates of how often down-ballot executives match a state's presidential result; the best fix is the actual roster.
- Sources fetched (0):
- builderNote: Preferred: load Ballotpedia's state executive roster and replace the rule; interim, use the margin-tiered probabilities with the world's seed.

### SG-P15-news-habits

- Reused from `data/research/stopgaps-oct19/E-careers-finance.json` (id `SG-P15-news-habits`); confidence low.
- Recommended: `"keep current values"`
- Low / high: `0.5` / `2`; unit: days
- Tag: ESTIMATED
- Basis: Pew pages returned 403 to the fetch tool and the local-news fact sheet markdown gave no usable figure. No sourced value; keep prototype delay 1 day, story life 30 days, 1 story per contact with their spreads.
- Sources fetched (0):
- builderNote: No change; the earlier 21-day story life was unsourced and is withdrawn.
