---
id: play-golden-path-m0-13-red-st-johnsbury-part-6-employer-tax-shares-fold
title: "The employer-tax shares table keeps a total per employer, not a row for every paycheck forever"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: split from play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth by the cause finder, Nov 11, 2026
---

**What.** The employer-tax engine writes one `shares` row for every paycheck (an employer's Social Security, Medicare and unemployment tax on it) and never lets one go. In St. Johnsbury, Vermont its tables grew 5.3 MB of records in six months, the third largest grower in the town. Keep each employer's running total, which the business's books read, and drop each paycheck's row once nothing reads it. Feeds: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth.

**Cause.** Found in code: src/core2/modules/employer-taxes.ts `payEmployerShare` puts a row in `shares` for every payroll receipt (line 716, id `employer-tax:<receipt id>`), and nothing deletes one. Its readers: `businessBooksView` (src/core2/business-books-view.ts line 58) sums `paidMinor` over every row of an employer, all time; the journal's source provider `slotFor` (employer-taxes.ts line 90, registered at line 139 as `journalSourceProviders`) looks a row up by its id when the journal resolves a posted entry; `employerShareOf` (line 502) looks one up by receipt id. Measured: St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, main d64255aa: the module's tables were 0.3 MB at month 1, 3.8 MB at month 6 and 9.1 MB at month 12 as JSON. The daily register lists `core2-employer-taxes-v1.shares` as "grows, a row per event, no fold yet".

**Fix.** 1. Add a table `paidByEmployer` with one row per employer (`id` the employer id, `paidMinor`), raised in `payEmployerShare` by the amount paid. Make `businessBooksView` read it instead of summing `shares`. 2. Find who calls the journal's source providers (src/core2/state.ts line 629 registers them) and for which entries: the window is how far back the journal can still ask for a paycheck's share. If the journal asks only for receipts it still keeps in detail (`core.cashJournal.detailedReceipts`), drop a share row when its payroll receipt leaves that map. Otherwise drop it at the monthly review once it is older than the oldest date the journal can ask about, and say which date that is in the PR. 3. Keep `employerShareOf` answering for rows still kept and returning undefined after. 4. Change the daily register's row for `core2-employer-taxes-v1.shares` to name the fold and its window. 5. A test in src/core2/modules/employer-taxes.test.ts: a business's taxes paid on its books are the same after a year with the fold as the sum of every share before it.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Cadence and summaries (.agents/rules/cadence-and-summaries.md): an old record folds into a summary once play no longer reads it, and the table names its fold and each reader's window. Speed: a year must not run slower than its base by more than 20 percent, measured on the same seed. Wire to the world: the business's books on screen show the same taxes paid as before the fold.

**Done when.** A second session plays a year in a drawn place on main (place and seed named) and sees the `core2-employer-taxes-v1.shares` row count at month 12 no higher than at month 2 (or held to one window of paychecks), the business's books in dev mode showing the same taxes paid as the same world on the base commit, and the records proof (`npm run speed:year -- --proof-out`) differing from the base only in the employer-tax tables.

**Waits on.** Nothing.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/business-books-view.ts, src/core2/state.ts, src/core2/modules/employer-taxes.test.ts (new), docs/design/daily-register.md
