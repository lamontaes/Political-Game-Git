---
id: people-husk-fill-in-opens-wallet
title: "A husk relative filled in when met opens with a wallet that matches the records"
area: people
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: claude/husk-wallet
pr: #5468
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:17:33.850Z
---

**What.** Husk-tier relatives open with no cash (liquidMinor 0 in population.ts openingFamilies) and fillInPerson (state.ts) gives a filled-in husk no wallet, so a relative the player meets and who lives in town has nothing in any account while the counted residents around them do. When a husk is filled in, give them the transaction balance a person at their household's recorded income keeps (starting-cash.ts medianTransactionBalance, SCF 2022), taken from the household or the wider population's counted cash so no dollar is created, and mark it ESTIMATED with its spread.

**Rules.** Money is conserved: the dollars come out of the counted tier's cash for the place, never made up. One model, two tiers: a filled-in person matches what the records already say. Estimate, never UNKNOWN.

**Done when.** In a played world (buildBenchWorld, drawn place and seed named) a husk relative who lives in town is filled in by the player meeting them and then holds cash by record id while the place's total cash is unchanged; src/core2/opening-adults-cash.test.ts and the money-conservation guard pass.

**Files.** src/core2/state.ts, src/core2/population.ts, src/core2/opening-adults-cash.test.ts

**Notes.** From the world-opening-husks-in-town-hold-no-cash investigation (#5423): the zero-cash adults there were cabinet heads, but husks hold nothing by design.

Checked Oct 20 (claude), released, not built: this item's premise needs correcting. Opening kin husks are people in `core.people` with tier `husk` (the inactive tier, population.ts `relatives`), not entries in `core.husks`, and no path fills them in when met: `fillInPerson` (state.ts) takes a counted resident household out of the residents account, and `promoteHusk` takes a `core.husks` entry. So before a wallet can be opened there has to be a rule for how a tier-`husk` kin person becomes a met person (move tier to weekly, rebuild the past as `fillInPerson` does for the counted). That is a design step for the people area, then the wallet follows from the household's recorded income.
