---
id: world-households-unpaid-living-costs-payday
title: "In a small Kansas town half of the outside living costs go unpaid: households hold no cash on the 1st"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/living-costs-arrears
pr: #4937
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:48:14.206Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Where the unpaid part sits (Oct 17, claude).** In that town the counted groups pay their outside living cost in full (the one counted flow asks $627 and gets $627 on February 1 and on March 1); the shortfall is the full households. Twelve full households carry this cost; on the last month six paid nothing and the twelve together asked $12,208 and paid $5,139. They hold no cash on the 1st because everything they earn is spent between paydays on food and other purchases, which run before the 1st. So the fix is the order and timing of a full household's spending against its pay (a bill that cannot be paid on the 1st waits for the next payday as arrears, as counted housing already does), not the counted tier.

Sent back 2026-10-20 from PR #4937 (branch claude/living-costs-arrears): Morning check: outside-living-cost arrears and daily retries are introduced only when !countedPays && !countedPaid in residents.ts. The counted path still calls chargeGroups with the current base, and counted-money.ts carries arrears only for housing, so counted households lose unpaid living costs while full households retain them. No new registry row/code marker describes this tier-specific shortcut. Apply the same arrears rule to counted groups, preserving per-group obligations and conservation, before calling the household fix complete.; finish on that branch, merge main into it first.
