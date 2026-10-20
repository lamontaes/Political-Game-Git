---
id: core-wiring-gaps-trace-pass
title: "Find engines whose output nothing reads, from a played year"
area: core
kind: research
priority: 3
size: M
status: done
claimed-by: claude/table-trace
pr: #4869
blocked-on:
milestone:
source: "follow-up to core-wiring-gaps (static scan, Oct 15, 2026)"
claimed-at: 2026-10-17T04:35:15.477Z
---

**What.** The static scan in `core-wiring-gaps` found tables with no reader by name. It cannot see a record an engine writes to a person, the journal or the log that no other engine reads, nor a read through a helper that builds the table name. Run a one-year played world and, for each module, list what it wrote (tables, events, person fields, journal entries) against what another module read, using the existing read tracing in a debug run. File one pool item per writer with no reader, naming the record ids.

**Rules.** An effect is a read, not a record. Bookkeeping is a debug switch: run the tracing in a test, not in play. One rule, all 56 places: draw the place and seed, and name both.

**Done when.** The report for a drawn place and a seed the builder did not choose lists every module's unread writes by record id, with one pool item filed per module, in a document under `docs/` and in the PR body. The owner plays it: nothing at once; each filed item removes a record that does nothing.

**Files.** docs/, scripts/core2-year/

**Notes.** Start with the tables the static scan did not settle: `chairs` (parties), `households` and `payments` (credit), `kin` and `parameters` (renewal), `regions` (regional). The `trace-audit` skill describes the full 56-place audit; this is the smaller per-module pass.
