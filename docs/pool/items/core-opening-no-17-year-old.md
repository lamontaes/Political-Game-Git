---
id: core-opening-no-17-year-old
title: "A place whose sample has no resident aged 17 still opens (Polebridge, Montana)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4655
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The world build failed in Polebridge, Montana because the player pick wants a resident aged 17 and the town has none. Fall back to the nearest age in the generated opening, marked as an estimate, rather than failing. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** Polebridge, Montana (and a drawn place with no 17-year-old) opens a world and plays a month; a test names the place and the age chosen.

**Files.** src/core2/population.ts, src/bench/world.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4655 (branch claude/core-opening-no-17-year-old): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
