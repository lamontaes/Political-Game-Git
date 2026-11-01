---
id: laws-medical-bills-year-cost
title: "The medical bills' monthly pass costs a country's year up to 19.5% (Ringgold, Louisiana, year 4): cut the row copies and journal postings it makes for counted households"
area: laws
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: laws
---

**What.** After the quadratic cut in #7036, the monthly bill pass (src/core2/medical-bills.ts billMedicalCare) still adds up to 19.5% to a year (the speed lead's alternating four-year Ringgold, Louisiana runs: +3% and +19.5% in year 4; three of four head runs put year 3 or 4 past 120 s, against 103 to 116 s on base). In a profiled Long Hill, Connecticut year (seed m7b) what is left is the put of about 21,300 bill rows a month (module-state put, plainCopy of each row with its members, webLinks and ownRecordsFor arrays), the cash journal postings the payments make (postCashJournal, projectCashJournal), and recordMedicalDebt.

**Rules.** A speed cut changes nothing the simulation decides: the records proof (speed:year --proof-out) is identical, or differs only in fields dropped from the bills' own rows, named. Keep why fields only for full households and the people the player deals with (AGENTS.md, Keep it simple: save why reasons only for the player and the people they deal with). One rule, all 56 places: time it in places drawn from all 56.

**Done when.** In Ringgold, Louisiana and one other drawn place (names and seeds given), four years of speed:year alternating base and head twice show every year within 10% of base; the records proof matches (or names only the dropped bill-row fields); law-wiring-medical-debt.test.ts passes with MEDICAL_DEBT_SEED=wf-med-1 and one fresh seed.

**Files.** src/core2/medical-bills.ts, src/core2/modules/credit.ts

**Notes.** TODO
