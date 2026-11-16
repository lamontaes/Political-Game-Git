---
id: dev-mode-industries-page
title: "Dev mode shows the town's industries: every business, its staff and books, month by month"
area: play
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: industries thread (Account lead)
pr: "#9631"
after: dev-mode-views-register-from-their-own-files
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Owner, Nov 16 01:58Z (cmsg_01TQLdz583SA7sRfRB4dFowZ3UgS4n8K2932PQhmyxdRRh): 'I think the dev mode stuff should be built immediately, so that way it can be traced, easily within the game'; Nov 16 00:59Z (cmsg_01TQLdz583SA7sRfRB4dFowZGTBKaBVjdkwbM7HYKuh6sk); plan approved 02:08Z; combined industry-law report, 'What dev mode could not show'"
---

**What.** Dev mode can show what a law charged each business, but not a town's industries: which businesses each industry has, their staff, sales, payroll, costs and cash, or a business month by month with the people it hired and let go. The industry-law tracers had to read code and write scripts for each of these. Seen: dev mode, Calendar sheet, the Industries panel.

**Cause.** Found in code: no dev-mode view reads the business books by kind. The books (`businessBooksView`, src/core2/business-books-view.ts), the business engine's staff count (`businessesIn`), its monthly trading records and the jobs engine's change records all exist, but no screen lists them.

**Fix.** One tally, `industryTally` (src/bench/dev-industries.ts), every business by its books' kind with staff from `businessesIn` and money from `businessBooksView`, and `industryBusiness` for one business month by month from the trading and job-change records. A dev-mode view (src/bench/dev-views/industries.ts) serves both, and its page part draws on the Calendar slot. Other threads' twin and bill-card views call the same tally.

**Time box.** 3 hours, Opus, medium.

**Rules.** A view of the records, never its own count. Read-only, spends no game time. Control names and record data only.

**Done when.** A test pinned to Center ND (3813180, seed ilt-3813180) shows the tally's open businesses and staff by kind equal the business engine's own, and one business's months come from its trading records. A browser check on a fresh drawn life shows the panel on the Calendar with worded industries, a business's months and a record opening in Trace. A second session sees the panel at a drawn place it names with its seed.

**Waits on.** dev-mode-views-register-from-their-own-files (#9619).

**Files.** src/bench/dev-industries.ts, src/bench/dev-industries.test.ts, src/bench/dev-industries.browser.mjs, src/bench/dev-views/industries.ts, src/bench/ui/dev-industries.mjs, src/bench/play.css, src/core2/modules/business.ts (re-exports), src/core2/business-books-view.ts (import).
