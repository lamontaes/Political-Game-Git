---
id: world-small-dollar-lender-costs
title: "The town's small-dollar lender pays its costs and its owner's draw, so its room to lend stops growing with every month's interest"
area: world
kind: stopgap
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: none
source: stand-in triage T4 (Nov 10, 2026), docs/stopgaps/triage-2026-11-10/world.md
claimed-at:
---

**What.** Every dollar of interest and fees the town's small-dollar lender collects stays in its cash and is lent again, and it pays no rent, wages, charge-offs or owner's draw. Over a long run its room to lend grows without limit, so a town's high-cost lending balloons for no reason in a hundred-year save.

**Cause.** Found in code: src/core2/modules/credit.ts lines 1556 to 1563 (stopgap SG-WORLD-small-dollar-lender-keeps-interest): the lender's `roomMinor` is its whole `liquidMinor`, and no monthly posting takes costs out of it.

**Fix.** Add a monthly posting from the lender's cash for its costs (storefront rent, wages, charge-offs from its own written-off loans) and its owner's draw, sized from a sourced industry operating-cost and pre-tax-margin share (publicly traded payday lenders' annual reports, or the CFPB's or FDIC's studies of storefront lending), recorded as a parameter tagged SOURCED or ESTIMATED with its spread in src/core2/data/credit/small-dollar.json. The room to lend becomes capital plus retained earnings after those payments. Resolve the stopgap row.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: costs follow the lender's own books (loans, charge-offs), never a fixed percentage of an outcome. Every number lives in a parameter table with its tag and spread. Wire to the world: each cost and the draw is a journal posting to a named payee. Speed: one posting a month per lender.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`) in a drawn place with a small-dollar lender (place and seed named in the PR body) and sees, by journal record id, the lender's monthly rent, wage and draw postings, its cash and room to lend after twelve months below what the same lender holds with no costs, and SG-WORLD-small-dollar-lender-keeps-interest resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/data/credit/small-dollar.json, src/core2/data/stopgaps/world.json, src/core2/law-wiring-small-dollar-lenders.test.ts
