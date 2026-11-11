---
id: core-memory-arcadia-medical-bills-and-loans-grow
title: "A big town's medical bills and loans double every year and kill the desktop game in year 2"
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

**What.** In the world speed:year plays for Arcadia, California (0602462, seed app-heap-1), the live heap reaches 4,232 MB at the end of year 2, over the desktop app's 4,096 MiB limit, so the second year dies of memory. The two largest structures grow about twice as fast as the year: the coverage engine's medicalBills table holds 220,872 rows (248 MB) at year 1 and 443,213 (510 MB) at year 2, and credit.loans 52,085 rows (134 MB) and then 130,108 (374 MB). Counted moves, jobs.changes and countedCoverage each roughly double too. A long game in any large town cannot be played past its second year. Seen: the desktop game in a large town keeps running past its second year instead of stopping out of memory.

**Cause.** Needs cause. Measured by opus-5234 on main ad495d7745 with scripts/speed-years/probe-retained.ts app-heap-1 0602462 1 and 2 (heap freed by removing each structure, PR #8413). core-long-run-medical-bill-rows is done and its fold was meant to keep one row per billed household, so a table that doubles in a year means rows are kept per something else (per bill, per member or per month) or the fold does not run in this world; credit.loans has no fold item. A finder counts both tables' rows by kind and by age in this world before naming the writer.

**Fix.** None until the cause is found.

**Time box.** 4 hours

**Rules.** Speed: memory stays flat; a table keeps only what play reads, folded once its readers' windows are agreed with their owners. Ask why: the finder names the writer and the reason each row is kept by file and line before anyone folds it.

**Done when.** A second session runs npm run speed:year -- --seed app-heap-1 --place 0602462 --years 4 at --max-old-space-size=4096 in the played world and it finishes all four years, or the report names the next table by size with its key count; and in a drawn place it chooses (named with its seed) a household's medical bill and a borrower's loan still show on their screens.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/modules/credit.ts
