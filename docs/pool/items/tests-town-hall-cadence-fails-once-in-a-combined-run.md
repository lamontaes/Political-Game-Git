---
id: tests-town-hall-cadence-fails-once-in-a-combined-run
title: "The town hall cadence test failed once in a combined run and passes alone"
area: core
lead: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (mayor-acts PR, coordinator's request)"
checked:
---

**What.** `npx vitest run src/bench/mayor-acts.test.ts tests/english-parts-banks.test.ts src/core2/office-day-town-hall-cadence.test.ts src/core2/projects.test.ts` failed once on head 91ff0946 with "src/core2/office-day-town-hall-cadence.test.ts > a town hall is held on a cadence (seed 8920533dbb202c4e) > is offered again only once the interval has passed since the official's last", and passed on three reruns of the same command and twice alone. Seen: the same command passes in every run.

**Cause.** Needs cause. The first assertion that failed and the place were not captured (only the test name was). Candidate: one world reaching another in the same process (open question); the mayor-acts change adds no per-process state beyond the idempotent assignment of its reason provider into `OFFICE_DAY_MODULE.reasonProviders` in `openOfficeDay`, the same pattern as the existing offer providers and handlers.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** pinned-tests: never loosen the test.

**Done when.** The failing assertion is named with its place, and the combined command passes ten times in a row, and a second session reruns it and sees the same.

**Waits on.** Nothing.

**Files.** src/core2/office-day-town-hall-cadence.test.ts

**Notes.** One failure in five combined runs.
