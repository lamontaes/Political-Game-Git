---
id: world-standin-credit-business-books-part-1-opening-owners
title: "Every opening business has an owner record that the credit engine reads"
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
model: opus
effort: medium
root: none
source: split from world-standin-credit-business-books in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The generated opening records no owners: the largest businesses by staff, up to the state's estimated share of jobs in multi-establishment firms, belong to firms based outside the town, and every other is owned by its highest-paid current worker as owner-operator. Replace that with an owner record per opening business, from who founded or bought it (a resident's job and money history) and, for absentee and corporate owners, from business ownership records, and have the credit engine read the owner when it decides on a credit line. This is the first of three parts of world-standin-credit-business-books.

**Cause.** Found in code: `open` in src/core2/modules/business.ts (line 240) calls stopgap("SG-WORLD-business-opening-owners") and makes each business's highest-paid worker its owner-operator; the row is open in src/core2/data/stopgaps/world.json with the replacement "owners from the opening's history, with absentee and corporate owners from business ownership records".

**Fix.** Write an owner record per opening business from sourced ownership data (absentee multi-establishment share by state, resident founders from the person's history), replace the highest-paid-worker rule, and make the credit engine read the owner record when it decides on a credit line.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the credit engine must read the owner at the moment it decides. No dice: who owns a business follows the opening's records and the state's recorded ownership share. Estimate, never UNKNOWN: an owner the data cannot name is marked ESTIMATED with its source. One model, two tiers: a counted owner is read by the same rule as a full one, times their count.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named), plays a year in dev mode and opens a business: it shows an owner record by id (resident, absentee or corporate), and the credit engine's decision on that business's credit line cites the owner record id. A test in src/core2 names the place and seed, and SG-WORLD-business-opening-owners is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps/world.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given every opening business an owner record for the credit engine; no player sees it.
