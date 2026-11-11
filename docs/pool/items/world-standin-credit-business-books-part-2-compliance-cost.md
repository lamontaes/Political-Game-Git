---
id: world-standin-credit-business-books-part-2-compliance-cost
title: "Compliance cost per industry comes from Census PACE abatement costs and is read by the business books"
area: world
kind: stopgap
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
source: split from world-standin-credit-business-books in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A compliance duty costs every bound business twice the manufacturing average pollution-abatement share of its operating costs, because no per-industry abatement cost data is loaded. Load the Census Pollution Abatement Costs and Expenditures (PACE) operating costs by industry (NAICS) as a sourced table, and scale the cost by the standard the county misses. The business books then carry a cost that differs by industry. This is the second of three parts of world-standin-credit-business-books.

**Cause.** Found in code: `routeCompliance` in src/core2/modules/business.ts (line 1020) calls stopgap("SG-WORLD-business-compliance-cost") and applies a flat multiple; src/core2/data/business/parameters.json (line 225) holds the flat share, and the row is open in src/core2/data/stopgaps/world.json.

**Fix.** Add the PACE abatement operating costs per industry as a sourced table with its spread, map the game's business kinds to NAICS, replace the flat multiple in `routeCompliance`, and resolve the stopgap row.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: every cost cites its PACE table and year, and the table never decides one firm's outcome. One rule, all 56 places: costs are national data scaled by the standard the county misses, with no place named. An effect is a read, not a record: the business books read the cost when they pay.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named), plays a year in dev mode and finds two bound businesses in different industries paying different compliance costs, each by cost record id traced to its PACE row. A test in src/core2 names the place and seed, and SG-WORLD-business-compliance-cost is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/data/business/parameters.json, src/core2/data/business/pace-abatement.json (new), src/core2/data/stopgaps/world.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced compliance cost per industry from Census PACE; no player sees it.
