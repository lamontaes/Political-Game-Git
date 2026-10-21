---
id: world-living-costs-pay-from-household-members
title: "A household's living cost is paid from its payer's cash only, so a household with cash in another member's account pays nothing"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/living-costs-household-members
pr: #4939
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:12:54.512Z
---

**What.** A household's outside living cost was paid from the bill's payer alone, so a household whose payer held nothing while another member held thousands paid nothing. The bill's payer pays first, then the household's other living members in id order, each from what they hold. The fix is in `src/core2/modules/residents.ts`, stacked on the carried-arrears change. Counted groups keep paying from their group fund.

**Rules.** Wire to the world: a living cost is paid from the cash household members hold, and the same dollar leaves their accounts. No dice: the members' cash decides who pays, never a share or a roll.

**Done when.** In the played world (`buildBenchWorld`, a drawn town with its place and seed named in the output), households pay at least 90 percent of the living costs asked over 90 days, and `src/core2/living-costs-arrears.test.ts` states it; it passes in Odessa, Delaware, Tenakee Springs, Alaska and Groton, Massachusetts.

**Files.** src/core2/modules/residents.ts

**Notes.** Built on claude/living-costs-pay-from-members, stacked on the carried-arrears change (world-households-unpaid-living-costs-payday). Over 90 days from the start: Odessa, Delaware (seed a4) 94 to 97 percent, Tenakee Springs, Alaska (a3) 93 to 98, Groton, Massachusetts (a5) 92 to 95. Not changed: the counted groups pay from their group fund, and the everyday living plan already pays from all members.
