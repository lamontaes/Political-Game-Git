---
id: world-local-sales-below-opening-forecast-part-1-household-categories
title: "Retail has planned buyers: household purchase categories from the Consumer Expenditure table"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #8499
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
source: split from world-local-sales-below-opening-forecast in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-world-local-sales-below-opening-forecast-part-1-household-categories
---

**What.** Retail's missing buyers are the household categories the counted purchase flows do not cover: apparel, furniture, electronics, household supplies and the rest of the Consumer Expenditure (CE) table, against a Census retail payroll that also sells everything else. Add one household purchase row per missing CE category, each with its national, four regional and five size parameters and the CE cell citation, as the existing rows do. On Oct 19 the BLS table cu-all-detail-2024.xlsx returned 403 from a cloud container, so if the session cannot load it, write the failing host in Notes and stop rather than invent values. This is the first of three parts of world-local-sales-below-opening-forecast.

**Cause.** Measured: Anon Raices, Puerto Rico (seed 1977d40995): retail's planned buyers cover 56 percent of its book demand. src/core2/data/opening-customers.json holds 12 `householdServices` rows and data/research/prices/household-prices-2026.json holds only utilities, fuel, telephone, internet, vehicle and beverage rows from BLS Table 2500.

**Fix.** Load the CE category means (national, four regions, five household sizes) with their cell citations, add one `householdServices` row per missing category in src/core2/data/opening-customers.json, and let the opening bind the counted households' purchase flows to retail businesses by those rows.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-local-sales-below-opening-forecast (the first-year shrink of a played town).

**Rules.** Research before building: every category row cites its CE cell and spread, and the table never picks one household's purchase. One model, two tiers: a counted household's purchase flow uses the same rule as a full household's, times its count. Estimate, never UNKNOWN: a category without a regional cell takes the national mean marked ESTIMATED.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a year in dev mode and reads a retail business's planned inflows: counted residents' purchase flows for the new categories appear by flow record id, and the share of retail book demand with planned buyers is higher than the 56 percent measured in Anon Raices, Puerto Rico (seed 1977d40995), printed for both places as a report. A test in src/core2 names the place and seed.

**Waits on.** Nothing. It needs a session whose network reaches bls.gov for the CE table.

**Files.** src/core2/data/opening-customers.json, src/core2/opening-customers.ts, data/research/prices/household-prices-2026.json

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:55 UTC) on branch claude/pool-world-local-sales-below-opening-forecast-part-1-household-categories.

Released by next (2026-11-13): no push to claude/pool-world-local-sales-below-opening-forecast-part-1-household-categories since 2026-11-11 02:56 UTC, more than twice its 6-hour time box. Continue on branch claude/pool-world-local-sales-below-opening-forecast-part-1-household-categories and pull request #8499.
