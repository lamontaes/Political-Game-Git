---
id: laws-minimum-wage-rates-before-2026
title: "Minimum wage rates before July 2025 for the states the dated table starts late"
area: world
kind: research
priority: 3
size: M
status: done
claimed-by: claude/min-wage-ak-2025-s5
pr: #4855
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T02:04:52.934Z
---

**What.** The dated minimum-wage rows start late for states whose first row is after the game's start date (January 20, 2025). Checked against `data/research/laws/minimum-wage-history-2000-2026.json` on Oct 17: all 56 places have history before their first dated row; the one gap was Alaska's January 1, 2025 inflation-indexed rate ($11.91), now a sourced row (Alaska DOLWD news release 24-26).

**Rules.** Research before building: each figure cites its source. One rule, all 56 places.

**Done when.** Every place's rate in force on the start date reads from a sourced row, not from the federal floor by default or a carried estimate; the minimum-wage history test passes.

**Files.** data/research/laws/minimum-wage-history-2000-2026.json

**Notes.** Done in the pull request that carries this note.

Sent back 2026-10-16 from PR #4650 (branch claude/pool-min-wage-history): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
