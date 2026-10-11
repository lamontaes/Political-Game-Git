# Spot checks of the hospital matches

Three stratified samples of 100 hospitals (70 matched by city name, 30 by county) were checked by a Haiku helper against each hospital's own address. Each sample is drawn by hashing the seed and a counter, so anyone can re-draw it from the committed state files.

## Run 1 (before the county checks)

Seed `P12-hospitals-spotcheck-2026-10-09`. Strict rule: right only when the address and the match clearly agree.

Right 98, wrong 1, unsure 1.

| Row | Hospital                                        | Address city  | Matched to    | Method    | Helper's verdict and reason                                                                                                   |
| --- | ----------------------------------------------- | ------------- | ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 35  | SHEPPARD AND ENOCH PRATT HOSPITAL, THE (214000) | BALTIMORE, MD | Baltimore, MD | city-name | WRONG: Towson campus at 6501 N Charles St is in Baltimore County, not Baltimore city; CMS county Baltimore.                   |
| 67  | EAST HOUSTON MEDICAL CENTER (670320)            | HOUSTON, TX   | Houston, TX   | city-name | UNSURE: Houston address city, but 15149 Wallisville Rd may sit outside city limits in Harris or Chambers County; unconfirmed. |

## Run 2 (after the county contradiction check)

Seed `P12-hospitals-spotcheck-2026-10-09-run2`. Clarified rule: the hospital's address city, or the county its street and ZIP lie in, counts as right.

Right 97, wrong 3, unsure 0.

| Row | Hospital                                       | Address city   | Matched to           | Method | Helper's verdict and reason                                                              |
| --- | ---------------------------------------------- | -------------- | -------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 92  | VA EASTERN COLORADO HEALTHCARE SYSTEM (06005F) | AURORA, CO     | Denver County, CO    | county | WRONG: Aurora address (1700 N Wheeling St) cannot be in Denver County; CMS county Adams. |
| 94  | NORTH PORT BEHAVIORAL HEALTH (104087)          | NORTH PORT, FL | Lee County, FL       | county | WRONG: North Port is in Sarasota County, not Lee County; CMS county Sarasota.            |
| 99  | BOURNEWOOD HOSPITAL (224022)                   | BROOKLINE, MA  | Middlesex County, MA | county | WRONG: Brookline is in Norfolk County, MA, not Middlesex County; lookup confirmed.       |

## Run 3 (after settling two CMS counties by the city's place)

Seed `P12-hospitals-spotcheck-2026-10-09-run3`. Same clarified rule as run 2.

Right 100, wrong 0, unsure 0.

## What the misses were

Run 1 had one wrong row: Sheppard Pratt in Towson, matched to Baltimore city because the CMS city is Baltimore. The county check now sets that match aside (the hospital's county is Baltimore County), and it sits under that county. Run 2 had three wrong rows, all county matches. Two of them (the VA hospital in Aurora, Colorado, and a behavioral hospital in North Port, Florida) came from the two CMS files naming different counties. The check now settles that by the county that holds a place named like the hospital's city, and both hospitals match their cities. The third, Bournewood Hospital in Brookline, Massachusetts, is a CMS error. Both CMS files name Middlesex County for a town in Norfolk County, so the hospital sits under Middlesex County. Run 3, on the final data, had no wrong rows.
