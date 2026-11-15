---
id: metrics-people-and-homes-by-year
title: "The town's people and homes kept by year: people, households, rentals, empty rentals, people without a home"
area: people
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-5acrpm
pr: #9059
after: metrics-output-numbers-registry
blocked-on:
lead: people
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-12
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** Housing keeps one stock row per place that is overwritten each time, and the homeless count keeps only its latest figure, so no year's people or homes can be shown beside the last. The residents and housing engines already hold these counts and write them at month's end; the homeless count writes on change as it does now and the registry keeps its December value. People by tier are counted on the events that change them (a birth, a death, a move in or out, a fill-in), never by walking every person each month. Seen: Metrics' people in town, households, rentals, empty rentals and people without a home, with a years table.

**Cause.** Found in code: src/core2/modules/housing.ts keeps one stock row per place, overwritten, and src/core2/modules/homeless-count.ts (`openHomelessCount`) keeps only the latest count.

**Fix.** The residents and housing engines write these at month's end, and people by tier on the events that change them, through `putOutputNumber`. The December step closes each year row.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. Speed (owner, Oct 29): no index of living people by place exists, so count named people on the events that change them rather than scanning each month; nothing new reads the whole world. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays two years in a drawn place, naming the place and seed, and sees two years' figures for each in the years table.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/modules/housing.ts, src/core2/modules/homeless-count.ts, src/core2/modules/world-metrics.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
