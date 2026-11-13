---
id: web-reads-engine-records
title: "The outcome web stops keeping its own rate where an engine counts the fact"
area: world
kind: cleanup
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: metrics-output-numbers-registry
blocked-on:
lead: effects
model: sonnet
effort: high
root: design-one-model-two-tiers
source: docs/design/output-numbers.md (#8926), owner's ask of Nov 12
---

**What.** The outcome web keeps 23 modeled rates (`keptOutcomes`) for facts that the crime, public-safety, housing, counted-moves, renewal and voting engines already count: crime, police, arrests, detention, schools, homelessness, evictions, rentals, moves, births, turnout and deaths. A view that stores its own version of a fact is a duplicate, so each such measure reads the engine's record through the registry and its kept outcome is deleted. The work ships as two pull requests: safety first, then homes, moves, births and turnout. Seen: Metrics' crime, police, arrests, homelessness, evictions, moves, births and turnout, each one figure.

**Cause.** Found in code: src/core2/data/outcome-web/outcome-web.json keeps 23 modeled rates (`keptOutcomes`) for facts that the crime, public-safety, housing, counted-moves, renewal and voting engines count.

**Fix.** Each such measure reads the engine's record through the registry, and its kept outcome (and the matching row in the bases file) is deleted. The web's links read the engine's record instead.

**Time box.** 10 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (owner, Oct 13): the web's links read the engine's own record at the moment they decide, so a stored copy is deleted, not kept beside it. One engine per mechanic (owner, Oct 27): the engine that already holds the figure writes it once, and every view reads that row; a screen that computes its own version is a duplicate to delete. Replace, never layer (owner, Oct 14): the old counting code is deleted in the same pull request, and the pull request body counts what was removed.

**Done when.** A second session plays a year in a drawn place, naming the place and seed, and each figure on Metrics equals the engine's record in dev mode's Trace.

**Waits on.** metrics-output-numbers-registry.

**Files.** src/core2/data/outcome-web/outcome-web.json, src/core2/modules/outcome-web.ts

**Notes.** From docs/design/output-numbers.md (#8926), owner's ask of Nov 12.
