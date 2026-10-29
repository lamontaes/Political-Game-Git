---
id: tests-six-bench-browser-checks-red-on-main
title: "The six bench browser checks that fail on clean main (buttons, money, people, travel, politics, sheets) pass again or are deleted with the screen they checked"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/tests-six-bench-browser-checks
pr: #6350
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T16:14:23.763Z
---

**What.** The screens lead reported that the browser checks buttons, money, people, travel, politics and, in some places, sheets fail the same way on clean main, and left them. A red check nobody runs guards nothing, so screens can drift from the mocks without anyone seeing it. Find the one shared cause (the lead said they fail the same way), fix it at the root, and make each of the six pass on a restarted bench in a drawn place; if a check covers a screen that no longer exists, delete the check in the same PR and say so. Time box: 3 hours.

**Rules.** A fix lands where the failure reproduces; diagnose from the check's own log. Never skip, disable or quarantine a check to get green. One rule, all 56 places: the check draws its place and names it and the seed. Restart the bench before each run.

**Done when.** Each of the six browser checks, run on a restarted bench on main after the merge, passes in a drawn place named with its seed in the PR body, or is deleted with the reason named; the shared cause is named by file and line in the PR body; a test or the check itself guards the cause.

**Files.** src/bench/checks/,src/bench/play.mjs,scripts/bench/

**Notes.** Filed by the CTO Oct 27 15:55 UTC from the screens lead's blocks (21:25 Oct 26 and 10:40 Oct 27). lead: play-first. milestone: play-first. Read: OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW; searched docs/pool/items for browser-check: only the done Campaigns item.
