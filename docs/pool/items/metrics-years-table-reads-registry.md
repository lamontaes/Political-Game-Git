---
id: metrics-years-table-reads-registry
title: "Metrics' years table and the timeline read the registry's year rows"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry, metrics-people-and-homes-by-year
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** The owner's November 12 ruling on Metrics was 'go with A plus the years table': a years table in each area and the timeline a measure opens. Both must be drawn from the registry's year rows with the screen computing nothing, so the table, the row and the timeline can never disagree. Seen: Metrics' years table in each area and the timeline a measure opens.

**Cause.** Design: the owner's November 12 ruling, "go with A plus the years table" (docs/design/output-numbers.md).

**Fix.** Draw both from the registry's year rows; the screen computes nothing.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. Screen to mock (owner): the table and timeline follow the approved Metrics mock and the shared controls, not a new one-off renderer. No hand-written player text in code: labels come from worded labels, and no raw ids, ISO dates or unrounded numbers show.

**Done when.** A second session plays three years in a drawn place, naming the place and seed, and sees three years in each area's table and on a measure's timeline.

**Waits on.** metrics-output-numbers-registry and metrics-people-and-homes-by-year.

**Files.** src/bench/metrics.ts, src/core2/modules/world-metrics.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
