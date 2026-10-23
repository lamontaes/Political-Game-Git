---
id: core-counted-deaths-from-every-hazard
title: "Counted deaths and departures reach working people, from each member's own hazard"
area: core
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4662
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Counted deaths and departures reach working people, from each member's own hazard. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections. Finish it on the existing branch claude/core-counted-deaths-from-every-hazard, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-counted-deaths-from-every-hazard.md and the files that pull request #4662 changes on claude/core-counted-deaths-from-every-hazard

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4662 (branch claude/core-counted-deaths-from-every-hazard): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4662 (branch claude/core-counted-deaths-from-every-hazard): merging main conflicts in src/core2/births-counted.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4662 (branch claude/core-counted-deaths-from-every-hazard): The new src/core2/counted-deaths-spread.test.ts fails at line 43 in Long Neck, Delaware, seed b20160eef2b43be6827ac36634c763a7: the annual death-count error is 2.5346351676118957, above the asserted maximum of 2. Fix the counted-flow totals on this seed without loosening the assertion. Typecheck, changed-file lint/format, zero-dice and release checks passed; finish on that branch, merge main into it first.
