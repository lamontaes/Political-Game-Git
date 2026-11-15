---
id: industry-7-hospitals-and-banks-keep-books
title: "A hospital and a bank keep business books, so they can lose money, cut staff or close"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-3-energy-laws-reach-the-towns-plant-and-mines
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "T54's outside-sales trace, Nov 15 (/mnt/project-files/account-lead/t54-outside-sales-trace.md); Account lead, Nov 15 21:52Z (file now, build after I2); owner, Nov 15 21:09Z (find what no law can touch)"
---

**What.** A town's hospital and its bank hire staff but keep no business books, so nothing they earn or spend is reviewed: a Medicaid cut, a payment rule or a bank law can never make a hospital cut staff or close, and a rural hospital closing (a real event) cannot happen. Owner, Nov 15 21:09Z: "Look for all these kinds of gaps" (21:09Z). Seen: the hospital's card and the Jobs screen after a law that cuts what it is paid, and dev mode's Trace of its books.

**Cause.** Found in code: src/core2/data/business-books.json `classifications` maps service:hospital and enterprise:banking to no kind (`kindId` absent), so the opening gives them no row in `core.finance.businesses`; the business module's monthly review (src/core2/modules/business.ts) reads only those rows.

**Fix.** A hospital kind and a bank kind in business-books.json with their IRS SOI cost shares, read by the same books, review and layoff path as every other kind; a hospital's sales are its medical bills (src/core2/medical-bills.ts `bookSale`) and an outside share row for patients from beyond the town; a bank's are its interest and fees from the credit engine. No second engine.

**Time box.** 4 hours, Opus, medium.

**Rules.** Wire to the world: a law on what hospitals are paid reaches the hospital's books and its staff. No dice. One rule, all 56 places.

**Done when.** A test pinned to a place with a sourced hospital shows its books at the opening and its staff after a year, with and without a cut to what it is paid through the game's own law path. Year 1 and records at three places, twice a side. A second session sees at a drawn place it names with its seed that the hospital's card shows its staff change after such a law.

**Waits on.** industry-3 (energy laws), by the lead's order.

**Files.** src/core2/data/business-books.json, src/core2/modules/business.ts, src/core2/medical-bills.ts and their tests.
