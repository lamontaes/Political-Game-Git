---
id: nation-president-orders-by-series-part-1-more-series-authorities
title: "More federal law series a President can set by order, each with a quoted authority and an engine that reads it"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from nation-president-orders-by-series in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** src/core2/data/executive/federal-orders.json holds one order, limit-power-plant-carbon. Add the other federal series an engine reads and an administration can set by rule or determination, such as the annual refugee admissions determination (immigration.admit-more-immigrants) and the series the powers catalog lets the federal executive move, each with its authority (statute and a precedent) quoted from a fetched page in data/research/executive. A series is listed only where an engine reads it. This is part 1 of nation-president-orders-by-series. Feeds: nation-president-orders-by-series-part-2-reversal-and-reader.

**Cause.** Found in code: src/core2/data/executive/federal-orders.json lists one order, read by `issueFederalOrder` and `presidentialOrderDecisions` in src/core2/modules/executive.ts; the Federal Register and congress.gov pages were blocked in the Nov 9 research, so the authorities are still to quote.

**Fix.** Research and quote the authority for each candidate series, keep only those an engine reads, and add them to federal-orders.json in the existing format with `analog` and `authority`.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One executive engine: the governor path generalized to a federal orderable set with a cited authority per series, never a second order system. Estimate, never UNKNOWN: a series with no sourced analog is left out. One rule, all 56 places: orders are data rows.

**Done when.** A second session, not the builder, checks the data in a played world at a place drawn from all 56 on a seed nobody chose: each new series in federal-orders.json has a quoted authority in data/research/executive, an engine that reads it (named), and appears in `federalOrderable()` so an unplayed President weighs it; a test names the place, seed and series.

**Waits on.** Nothing.

**Files.** src/core2/data/executive/federal-orders.json, src/core2/modules/executive.ts, src/core2/office-day-federal-president.ts, data/research/executive/orders-and-vacancies-2026-11.json
