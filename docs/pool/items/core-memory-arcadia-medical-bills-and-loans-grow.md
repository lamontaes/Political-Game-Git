---
id: core-memory-arcadia-medical-bills-and-loans-grow
title: "Newcomers to a big town's wider place pile up as one-person records, and its medical bills and debts grow with them"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** In the world speed:year plays for Arcadia, California (0602462, seed app-heap-1), the live heap reaches 4,232 MB at the end of year 2, over the desktop app's 4,096 MiB limit, so the second year dies of memory. The largest structures are the coverage engine's medicalBills (443,213 rows, 510 MB at year 2) and credit.loans (130,108 rows, 374 MB); counted moves, jobs.changes and countedCoverage grow with them. They all grow because the number of counted households grows: in the wider place around the town, newcomers arrive as one-person records every month and nobody leaves. Fix the counted moves so arrivals and departures keep that place's records level, and the bills, coverage and debts stop growing with it. Seen: the desktop game in a large town keeps running past its second year instead of stopping out of memory.

**Cause.** Found in code: src/core2/modules/counted-moves.ts `arrivals` (line 1370) and its departure loop (line 998), measured in Arcadia, California (0602462, seed app-heap-1, `buildBenchWorld` two-level, main d64255aa, Nov 11). The medical bills are one row per billed household (`medical-bill:<household id>`, src/core2/medical-bills.ts line 921), and `householdsToBill` (line 378) bills every live counted household in the billed places (line 427). The counted households in the wider place jurisdiction_cee13418bd94f6ec grow from 10,116 records at the opening to 19,352, 33,765 and 47,133 after one, two and three months, while the town's own place and the third place hold level, and the total weight barely moves (4,156,218 to 4,165,454 in a month). That place stands for 8.9 million weighted people, but 9,966 of its 10,116 records have weight 1 and about 150 have weights near 27,700. Two lines in src/core2/modules/counted-moves.ts make the records pile up. 1. `arrivals` (line 1370) picks the newcomer's template uniformly among the place's records (`shapes[unit("arrival") % shapes.length]`), not by weight, so nearly every newcomer copies a weight-1 record. The month's due, which is sized by the place's 8.9 million weighted people (line 1153), is then paid out as thousands of one- and two-person records. In month one, 3,167 households moved into that place from the rest of California alone. 2. The departure loop (line 998, `if (placeDue < size / 2) break;`) stops a place's departures when the group due next holds a heavy record larger than twice the place's due. That place had no `move:out` row at all in the first month, against 30 from the third place. So the place only gains records. Every new record is billed (medicalBills), gets a coverage row (countedCoverage) and, once unpaid past the wait, a `medical-debt:<household id>` loan that is never removed (src/core2/modules/credit.ts `recordMedicalDebt`, line 1036). That is why the bills and loans double each year.

**Fix.** In src/core2/modules/counted-moves.ts: 1. In `arrivals`, pick the template in proportion to `store.weightedCount(h)` (a cumulative sum over `shapes`, drawn with the same `unit("arrival")` hash), so a newcomer copies a record in the share of the people it stands for. A heavy template is larger than most months' due, so `if (left < size) break` (line 1372) carries the due to the next month, as it already does. Better: admit the newcomer with weight `min(template weight, left / counted members)`, so a heavy template takes exactly the due and no due waits. Choose one, and say which in the PR. 2. In the departure loop, when `next` is heavier than the place's due, lower its weight by the due (`h.weight -= placeDue / countedCount`) and record the move with that many people, instead of breaking. Keep the whole-household departure for records the due covers. Add the weight change to src/core2/counted-groups.ts as a store method (`setWeight`), since the store's version must move. 3. Test in src/core2/counted-moves-places.test.ts: in a drawn place whose wider place mixes weight-1 and heavy records (find one by drawing; the drawn-place-tests skill says how), the live counted records in each place stay within 5 percent of the opening over 12 months, and the weighted people move by the sourced rates. Do not fold medicalBills or credit.loans here; recheck them after the fix.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: memory stays flat; a year's records must not grow with the played months, measured on the same seed before and after. One model, two tiers: a counted record moves by the same rule as a full household, times its weight, so a heavy record moves part of its weight. No dice: the template and the part that moves come from the sourced rates and the seeded hash already used, never a new roll. Ask why: the PR names, by record id, one newcomer household and one departure in the wider place.

**Done when.** A second session runs `npm run speed:year -- --seed app-heap-1 --place 0602462 --years 4` at --max-old-space-size=4096 on main and it finishes all four years, or its report names the next table by size; the live counted households in each place, read at months 0, 3 and 12, stay within 5 percent of the opening. In a drawn place (named with its seed) a household's medical bill and a borrower's loan still show on their screens.

**Waits on.** Nothing.

**Files.** src/core2/modules/counted-moves.ts, src/core2/counted-groups.ts, src/core2/counted-moves-places.test.ts, src/core2/medical-bills.ts, src/core2/modules/credit.ts

**Notes.** Cause found (Nov 11, 2026, cause finder for Fable B): three probes on main d64255aa in Arcadia, seed app-heap-1. (1) medicalBills by month: billed households 37,024, 51,401 and 64,792 after months 1 to 3, with no debts yet, so the rows are billed households, not kept history. (2) The counted store by place: only jurisdiction_cee13418bd94f6ec grows, by about 13,500 records a month, and one-person records go from 20,160 to 44,015. (3) The counted moves table after one month: every arrival lands in that place, almost all as one- or two-person records, and no record leaves it. The medical-debt rows that stay for households that are gone (the debt is never cleared, stopgap SG-HEALTH-medical-debt-collections) are a smaller second growth; recheck them once the moves are fixed.
