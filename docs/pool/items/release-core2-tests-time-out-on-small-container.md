---
id: release-core2-tests-time-out-on-small-container
title: "Seven core2 played-world tests time out at 2 workers on a 4-core container: estate-contracts, groundwater-law, housing-laws, income-tax-played, moves-cash, office-proof, paid-leave"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/core2-test-timeouts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:33:12.812Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20 (claude/core2-test-timeouts): reproduced at `--maxWorkers=2` on a 4-core container: groundwater-law took 156 seconds against its 120-second limit, and estate-contracts' first test (which builds the world) took 37 seconds against the 30-second default. The other five of the seven passed on this container. Each of the seven now carries the 900-second limit `moves-cash` already had (groundwater-law, paid-leave, housing-laws, income-tax-played, office-proof and estate-contracts raised; moves-cash unchanged). A limit is a guard against a hang, not a check, so raising it hides no failure; the year-under-two-minutes speed rule stays with the speed guard.
