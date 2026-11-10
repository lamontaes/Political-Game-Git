---
id: people-press-outlet-nonpayroll-costs
title: "An outlet's books carry printing, broadcast, rent and supplier costs from a sourced cost structure, not payroll alone"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
standard: 2
lead: governing
model: sonnet
effort: medium
root: none
source: stand-in triage, Nov 10, 2026 (SG-PEOPLE-press-outlet-other-costs)
claimed-at:
---

**What.** An outlet's books record its people's pay and nothing else, so a paper never buys newsprint or a station never pays for transmission. Find what share of a newspaper's, a radio station's and a television station's costs is not payroll, and put it on the books.

**Cause.** Found in code: src/core2/modules/press.ts line 873 (marker SG-PEOPLE-press-outlet-other-costs, function that calls api.addBusinessBooks) passes annualOtherCostsMinor: 0 and files the outlet under kindId "information", whose ratios in src/core2/data/business-books.json (line 102) are telecommunications ones, not publishing or broadcasting.

**Fix.** From pages actually fetched and quoted (Census Annual Business Survey or Services Annual Survey expenses for NAICS 5121 and 5122 publishing and 5151 and 5152 broadcasting; BLS), source the nonpayroll share of operating cost for each outlet kind, add it to the parameter tables tagged SOURCED or ESTIMATED with spread, and set annualOtherCostsMinor from it (payroll divided by the payroll share) so the outlet's costs reach its suppliers through the books' existing supplier-purchase path. By counts, monthly: no new loop.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real shares calibrate, they never pick an outcome. Every number lives in a parameter table with its tag and spread. No dice. One rule, all 56 places. Check against people-press-small-town-outlets-close: more cost must not close every outlet; revenue from the book's own demand must stay above cost at the sourced margin.

**Done when.** A second session, in a played year of buildBenchWorld in a drawn place with a local paper (place and seed named), finds the outlet's books with a nonzero annualOtherCostsMinor by record id, a supplier purchase by the outlet on the cash journal, and the outlet still printing at year end; SG-PEOPLE-press-outlet-other-costs is resolved in src/core2/data/stopgaps/people.json.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/data/business-books.json, src/core2/data/parameters.json, src/core2/data/stopgaps/people.json

**Notes.**
