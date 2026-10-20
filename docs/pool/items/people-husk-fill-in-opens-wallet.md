---
id: people-husk-fill-in-opens-wallet
title: "A husk relative filled in when met opens with a wallet that matches the records"
area: people
kind: feature
priority: 3
size: S
status: claimed
claimed-by: claude/husk-wallet
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:17:33.850Z
---

**What.** Husk-tier relatives open with no cash (liquidMinor 0 in population.ts openingFamilies) and fillInPerson (state.ts) gives a filled-in husk no wallet, so a relative the player meets and who lives in town has nothing in any account while the counted residents around them do. When a husk is filled in, give them the transaction balance a person at their household's recorded income keeps (starting-cash.ts medianTransactionBalance, SCF 2022), taken from the household or the wider population's counted cash so no dollar is created, and mark it ESTIMATED with its spread.

**Rules.** Money is conserved: the dollars come out of the counted tier's cash for the place, never made up. One model, two tiers: a filled-in person matches what the records already say. Estimate, never UNKNOWN.

**Done when.** In a played world (buildBenchWorld, drawn place and seed named) a husk relative who lives in town is filled in by the player meeting them and then holds cash by record id while the place's total cash is unchanged; src/core2/opening-adults-cash.test.ts and the money-conservation guard pass.

**Files.** src/core2/state.ts, src/core2/population.ts, src/core2/opening-adults-cash.test.ts

**Notes.** From the world-opening-husks-in-town-hold-no-cash investigation (#5423): the zero-cash adults there were cabinet heads, but husks hold nothing by design.

**Checked Oct 20 (claude/husk-wallet), not built.** In a funded world (40 days in, a drawn place) a filled-in counted adult already gets their household's share of the counted group's account, split by recorded cash (`householdCash` and `releaseResidentHousehold` in `src/core2/modules/residents.ts`): about $2,000 to $3,000 for a household with income, $2 to $5 for a household with none. The cash is zero only when the group's own account is near empty (a poor group, or a world on its opening day, before the groups hold money). Matching the SCF median balance for the household's income (`medianTransactionBalance`) would then mean taking dollars from other groups' accounts, which changes the money split between groups: a design call for the economy owner or the CTO, not a small fix. A first version that topped the person up from the same group's account gave the same balances as no change (the share already covers it), so I reverted it. OWNER QUESTION: should a filled-in person's cash follow their household's income (taking from richer groups) or stay their household's share of the group's actual cash?

