---
id: core-counted-deaths-spearman-under-table
title: "Counted deaths run under the table in small towns: a record under one person stalls the month, and the opening seeds too few running illnesses (Spearman, Texas 8.4 against about 9.4)"
area: core
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9353
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: found by the Account lead's carry of the counted-deaths fix, Nov 14, 2026
---

**What.** Two years from the opening at train b4c11bc5b5 plus the cohort fix (`node --import tsx scripts/words/death-rate-check.ts --seed fam-b:2 --days 730`, the cause-finder's script kept at /mnt/project-files/death-rate/death-rate-check.ts, one world per process, place drawn from seed fam-b:2: Spearman, Texas, about 13,300 people in 7,925 records, 232 counted people died, 8.4 per 1,000 a year). The age mix gives about 9.4. San Isidro (5.0 against about 5.5) and North Vacherie (11.0 against about 9.4) are within the spread; Spearman is the one place still a tenth under. Seen: the 8.4 against 9.4 is read from the script above at the named place and seed.

**Cause.** Found in code: two causes in `applyCountedFlows` in src/core2/births-counted.ts, found by logging the month's cohort loop at Spearman (three counted places; the first lost 21.8 of 88.8 expected deaths in two years, the others 14.3 and 5.0):

1. `take = min(whole, ceil(debt), floor(owedNow))` then `if (take < 1) break`. A record that earlier part deaths left standing for under one person has `whole` under one, so `take` was under one and the break ended the whole month's illnesses for every cohort. From the month the first member of the most-owed cohort was such a record (month 17 at the first place), nothing fell ill there: its debt rose by exactly the month's expectation (3.7 a month, 0.1 to 27.7) and its running illnesses fell from 22 to 2. Logged: `BREAK-take 2026-08-01 m:1941 debt 0.76 whole 0.046 owedNow 11.03`.
2. The opening looks back month by month for illnesses still running, and each looked-back month began with empty debts (`fall(…, before, {})`), so the fraction of a person each cohort owed at the end of a month was dropped, not carried as in every played month. A month expecting 3.7 started 3, one expecting 1.8 started 1. The opening seeded about a half to four fifths of the steady stock of running illnesses and the stock grew for the first year (13 to 22, 24 to 32 and 4 to 7 running records at the three places), so deaths ran under onsets.

**Fix.** Break only when no whole person is owed (`min(ceil(debt), floor(owedNow)) < 1`); a record under one person falls ill whole and pays its weight of the debt. The look-back shares one debt map across its months and hands what is left to the opening month. Pinned regression `src/core2/counted-deaths-fraction-records.test.ts` stages half of San Isidro's counted records to a twentieth of a person through `countedPartDeath` and asserts illnesses begin every month (fails before with "illnesses begun in 2025-02-01: expected 0 to be greater than 0", passes after, 46 s).

**Time box.** 2 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: deaths follow the illnesses the records book; real rates check the total and never pick who dies. One rule, all 56 places: draw places and name each with its seed. Speed: a year may not run more than 20 percent slower than its base.

**Done when.** A second session replays Spearman, Texas, San Isidro, Texas and North Vacherie, Louisiana (`fam-b:2`, `fam-b:0`, `fam-b:1` with place purpose `relative-news`) for two years and reads counted deaths per 1,000 a year near each place's age mix and world mortality factor, and runs `npx vitest run src/core2/counted-deaths-fraction-records.test.ts`.

**Waits on.** Nothing.

**Files.** src/core2/births-counted.ts

**Notes.** Done as a measurement first: kept per-month expected, paid and debt by place. Built locally on branch spearman-deaths. The first step was a measurement, no code change: at Spearman and two more pinned places, list per age band the owed and paid deaths of each cohort and the illnesses running at the start and at the end of the two years, as the cohort fix's PR did at San Isidro, and write the cause into this item's Notes with the command and seed before anything is built. The estimate of the world's mortality factor for Texas was not read yet.
