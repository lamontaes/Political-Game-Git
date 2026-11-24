---
id: laws-checker-tests-every-level
title: "The law checker tests a law several levels can pass only at the town's level"
area: laws
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The law-wiring checker (`scripts/law-wiring/check.ts`) enacts each law at the lowest level of the town's chain that may pass it, so a law the town, the state and Congress can all pass is graded only as a town law. That is how a session reported laws work "only local". Its `--at` flag does not help: an amount is written at the level that governs, a question already in force is repealed at every level that holds it, and a budget line always changes the town's own budget. Seen: the law-wiring table (docs/reports/law-wiring-table.md), which the owner and leads read as what works.

**Cause.** Found in code: scripts/law-wiring/check.ts `townLevel` (line 700) walks city, county, state, federal and takes the first allowed; the amount change writes at the governing row's level (near line 964); the question change repeals at every level whose row says yes (line 763); `changeBudget` (line 1020) takes the city government first. Measured: with `--at state` and `--at federal` at Eveleth, Minnesota (checker seed take-effect-2), 9 of 31 laws were still changed at another level (/mnt/project-files/laws/probes/state-eveleth.json, fed-eveleth.json).

**Fix.** Make the level a law is changed at an input of each case: `checkLaw` takes the level, and the change functions write at that level (an amount as that level's own row, a question enacted or repealed at that level only, a budget line on that level's government). A pinned test runs one law at each level it may be passed at, at Eveleth, Minnesota, with a fixed seed, and fails when the row is written at any other level or nothing is read.

**Time box.** 4 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the checker grades every level by the same rule wherever it runs, and its test is pinned to a named place and fixed seed, about a minute per case, with no draw loops or scans.

**Done when.** A second session, not the builder, runs the checker for minimum wage at state and at federal in a drawn place and sees each row written at the level asked, with reach records from that row.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/check-levels.test.ts (new)
