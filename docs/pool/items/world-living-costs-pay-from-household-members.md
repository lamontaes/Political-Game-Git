---
id: world-living-costs-pay-from-household-members
title: "A household's living cost is paid from its payer's cash only, so a household with cash in another member's account pays nothing"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/living-costs-pay-from-members
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T15:46:46.550Z
---

**What.** A household's outside living cost was paid from the bill's payer alone, so a household whose payer held nothing while another member held thousands paid nothing. The bill's payer pays first, then the household's other living members in id order, each from what they hold.

**Rules.** Every dollar balances. No dice: the members' cash decides.

**Done when.** In a drawn town (name place and seed), households pay at least 90 percent of the living costs asked over 90 days (`src/core2/living-costs-arrears.test.ts`).

**Files.** src/core2/modules/residents.ts

**Notes.** Built on claude/living-costs-pay-from-members, stacked on the carried-arrears change (world-households-unpaid-living-costs-payday). Over 90 days from the start: Odessa, Delaware (seed a4) 94 to 97 percent, Tenakee Springs, Alaska (a3) 93 to 98, Groton, Massachusetts (a5) 92 to 95. Not changed: the counted groups pay from their group fund, and the everyday living plan already pays from all members.
