---
id: metrics-births-deaths-by-year
title: "Births and deaths with dates, counted by place and year, both tiers"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: people
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Counted deaths are written to a month row only when bookkeeping is on, and a named death leaves no date on the person, so Metrics cannot say how many were born or died this year and last. Each birth and death is counted on the day it happens, for both tiers, into the place's year row. Bookkeeping stays a debug switch (owner, Oct 11); the count that Metrics shows does not depend on it. Seen: Metrics' births and deaths this year and last.

**Cause.** Found in code: src/core2/births-counted.ts:1170 writes the counted month row only with bookkeeping on, and a named death leaves no date on the person (src/core2/modules/health.ts:1170).

**Fix.** The renewal, health and residents engines add each birth and death to the place's year row on the day, both tiers, and the person record keeps the death date. The counted deaths' bookkeeping-only month row (the condition at src/core2/births-counted.ts:1170) is deleted.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. One model, two tiers (owner, Oct 14): counted and named people are counted by the same rule, each event once. Speed (owner, Oct 29): births and deaths are counted on the day they happen, never found by a scan.

**Done when.** A second session plays a year in a drawn place, naming the place and seed. Metrics' deaths equal the death events in dev mode for the place, by tier.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/births-counted.ts, src/core2/modules/health.ts, src/core2/modules/world-metrics.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
