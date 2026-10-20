---
id: docs-roadmap-spec-commands
title: "Eleven M2 and M3 specs have no test command, so their passes cannot be set"
area: docs
kind: cleanup
priority: 3
size: S
status: blocked
claimed-by: claude/political-game-pool-pdqjm6
pr:
blocked-on: CTO adds the commands
milestone:
source: "found by docs-roadmap-m2-m3-passes (Oct 15, 2026)"
claimed-at: 2026-10-19T22:40:16.678Z
---

**What.** In `docs/roadmap/features.json` nine M2 and M3 specs now read passes:true because their command ran green on a fresh random seed. Eleven others have no `command`: M2-03, M2-10, M3-01 to M3-08 and M3-10. The CTO adds the command, so a session cannot set their passes. Candidate tests that exist today, unchecked against each spec's text: M2-03 `src/director/filing-visit.test.ts` and `src/core2/elections-filing.test.ts`; M2-10 `src/core2/two-level-elections.test.ts` and `src/core2/world-races.test.ts`; M3-01 `src/core2/legislature-bill-form.test.ts` and `legislature-sections.test.ts`; M3-03 `src/core2/legislature.test.ts`; M3-04 `src/core2/laws.test.ts`; M3-05 `src/core2/executive.test.ts`; M3-06 `src/core2/staff.test.ts`; M3-07 `src/core2/interest-groups.test.ts`; M3-08 `src/core2/constituent-cases.test.ts`; M3-10 `src/core2/world-legislating.test.ts`. M3-02 (negotiating) has no obvious test.

**Rules.** Sessions may change only `passes`, never `test`. The CTO adds `command`. A spec stays false until its test passes in a place drawn from all 56 and the finisher has played it in the bench.

**Done when.** Each of the eleven specs has a command the CTO accepted, run on a fresh random seed in a drawn place (named in the PR body) with the result recorded, and passes set to match. The owner plays it: nothing at once; the golden path steps are checked by a test, not by memory.

**Files.** docs/roadmap/features.json

**Notes.** The nine now true are M2-01, M2-02, M2-04, M2-05, M2-06, M2-07, M2-08, M2-09 and M3-09. M2-06 shares the campaigns test with M2-05. The bench-play half of each spec is not shown by a test and is still for a checker.
