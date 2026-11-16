---
id: dev-trace-police-log-to-its-usual-and-victims
title: "Dev mode's Trace opens a printed police log to how it stood against the town's usual, its space, and who it happened to"
area: play
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: interviews thread (branch claude/project-thread-sew1gc-police-dev-trace)
pr: 9649
after:
blocked-on:
lead: words
model: opus
effort: medium
source: "Owner, Nov 16 00:59Z: what a thread traces by script, dev mode traces in the game; the Surrency police-log trace of Nov 15"
root: none
---

**What.** Tracing the Surrency police-log red on Nov 15 took scripts: the crime month's carried fraction, the counted groups it happened to, the closed months the usual rests on, how the month stood against them and the space the desk gave the log. Dev mode's Trace showed only the printed story and the crime month's counts, and answered "not-a-record" for the wire's `police-log:<month>`. Seen: dev mode's Trace screen, opened on a printed police log.

**Cause.** Found in code: `reverseLinks` in src/bench/dev-trace.ts has no branch for a crime month or a printed police log. The comparison lives only on the wire row (`policeLog` in src/core2/modules/press.ts), which the press lets go, and the carried fraction is never kept on the month row (`runPlace` in src/core2/modules/crime.ts keeps it only in the running `carry` table).

**Fix.** The press exports `policeLogComparison` (the wire's facts, now built by it) and `policeLogWhy` (the reported count, that comparison, the closed months the usual rests on and the desk's `usualSpace` share), and dev mode's Trace reads them as reasons on a printed police log, with the usual's months as records. The crime month row keeps each kind's `carriedIn` and `reportedCarriedIn`, and the Trace links a crime month to its counted groups' tallies. Nothing new decides anything; the trace reads the functions the paper reads.

**Time box.** 3 hours.

**Rules.** Wire to the world: the trace reads the same press and crime records the paper and the desk read in a played world, never a copy of them.

**Done when.** In a played Hesperia, Michigan (seed pl8, 200 days) dev mode's Trace on the July 2025 police log shows the reported count, each fact the wire carried (equal to the wire), the space share and the five months of record, and the crime month shows its carried fractions and counted groups. A second session plays a drawn place on main, opens a printed police log on dev mode's Trace screen and sees why it ran, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/dev-trace.ts, src/core2/modules/press.ts, src/core2/press-desk.ts, src/core2/modules/crime.ts, src/bench/dev-trace-police-log.test.ts (new), src/bench/printed-police-log.test.ts
