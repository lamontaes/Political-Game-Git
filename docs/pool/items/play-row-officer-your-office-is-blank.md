---
id: play-row-officer-your-office-is-blank
title: 'Playing as a county coroner, sheriff, clerk, assessor or treasurer, Politics → Your office is a blank sheet and the card says "Works outside the town" (Bartley, West Virginia)'
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Bartley, West Virginia, seed c9b435a2-2d6a-498e-b511-1c8e25b2a260)
---

**What.** On main 596d5127, an Advanced start in Bartley, West Virginia (seed c9b435a2-2d6a-498e-b511-1c8e25b2a260), stepping in as Coroner Kevin Dawson, the first name Play As lists. Politics → Your office shows only the tab row, with nothing under it. You says "I've served as coroner since 2015", but the line under his name, and Jobs and study, read "Works outside the town, Buyers and sellers outside the town · Pay $10.78 per day · Hours 5.7 per day". In eight weeks of Week presses he had no office act, meeting or desk. On the live bench, `/api/office?id=person_d9878ea16b751954` answers `"jobs":[]` and `/api/seat` answers `"bodies":[]`. Seen: every office Play As offers shows its seat on Your office.

**Cause.** Found in code: Your office draws only office jobs (`officeParts` in `src/bench/play.mjs`, from `officeView` in `src/bench/office.ts`) and lawmaking bodies (`seatRows`, `/api/seat`). Office jobs are written by `reviewOfficeJobs` (`src/core2/modules/office-day.ts`, line 1017) only for a seat whose kind has a row in `PAY_ROWS` (`src/core2/office-day-pay.ts`, line 30: council, township board, mayor, county board and county executive). A county row officer (coroner, sheriff, clerk, assessor, treasurer, prosecuting attorney) has no pay row and no body, so both lists are empty, and the card falls back to the person's own job.

**Fix.** `officeView` also returns the player's serving terms that have no office job (`servingTermsOf` in `src/core2/modules/offices.ts`), as a seat with its title, the date service began, the end of the term and the next election for it. `officeParts` draws them in the same My seat plate, with no pay row when none is on record. The pay of row offices (a research row in `PAY_ROWS`) is a separate item. Test: a drawn Advanced start as a county row officer has a non-empty `jobs` or seat list in `officeView`.

**Time box.** 2 hours

**Rules.** One rule, all 56 places: every serving office Play As can offer has a seat on Your office, read from the offices table, never a named office kind. Estimate, never UNKNOWN: a row office's pay waits on its own research row and is left off, never shown as zero.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start as a coroner, sheriff or clerk whose Politics → Your office shows the seat (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/office.ts, src/bench/play.mjs, src/core2/modules/offices.ts (read only), src/core2/office-day-pay.ts (read only)
