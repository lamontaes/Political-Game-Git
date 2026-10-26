---
id: core-speed-focus-daily-recent-contact
title: "Daily focus only for people the player saw in the last 30 days, read from the tie"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/speed-focus-recent-contact
pr: #6102
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T18:42:35.910Z
---

**What.** Everyone the player meets joins the daily focus set for good (met-in-group ties, owner Oct 10), so a town's later years run far slower than its first: in Bedford, Wyoming the focus set grows from 20 to 78 and year three runs 2.05 times year one on main with the drives change. The acting CTO ruled on Oct 25 (OWNER-DECISIONS): daily focus only for people seen in the last 30 days, as an index read, not a scan. Prototyped Oct 25 (core-speed-contact-offers-grow-with-ties Notes): Bedford ran 32.4, 55.4 and 41.6 s, year three 1.28 times year one.

**Rules.** Speed: a town's year in under two minutes and year three within 1.2 times year one; never scan the whole world or history daily. The window is a scheduling cadence, like the tiers, not a behavior (acting CTO, Oct 25). Sliding scales: no person is barred from an act; they choose at their tier's cadence instead of daily.

**Done when.** In the played world (buildBenchWorld), Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed), three years each on one process: a focus person outside the player's household and family chooses daily only while their tie with the player had contact within focusDailyContactDays (read from that tie, no daily pass over the focus set), otherwise at their tier's cadence; the player's household and family still choose daily; the year seconds before and after are in the PR body, with year three over year one, and any remaining gap to 1.2 named by module. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/calendar.ts, src/core2/data/parameters.json

**Notes.** Filed by the speed lead from the acting CTO's Oct 25 ruling.
