---
id: play-county-treasury-named-in-capitals
title: 'A county commissioner''s card reads "Commissioner, COUNTY OF PASSAIC treasury": a government''s treasury is named from the Census listing''s capitals'
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/p2-county-treasury-name
pr: #9003
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P2, Nov 13 (Hewitt, New Jersey, seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0)
---

**What.** An Advanced start as a Passaic County commissioner in Hewitt, New Jersey (seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0) opens "You" with "Commissioner, COUNTY OF PASSAIC treasury" under the name. Every public worker paid by a county or town whose Census listing is in capitals reads the same way, and the obituary's "the government of COUNTY OF ..." too. Seen: a player's card shows a government named as people write it.

**Cause.** Found in code: `src/core2/modules/budgets.ts` names each local government row from the listing as it is (`name: countyUnit.name`, `name: city.name`), and the treasury organization takes `${row.name} treasury`. The Census government-units listing writes most names in capitals ("COUNTY OF GOSHEN", "TOWNSHIP OF WEST MILFORD"). `governmentTitleName` in `src/core2/offices-local.ts` already says such a name as people write it.

**Fix.** The county and city government rows are named through `governmentTitleName` (re-exported from the executive family's entry, `src/core2/government-jurisdictions.ts`), so the treasury and every reader of the row's name read "County of Passaic". A test draws two places and checks no treasury is named "COUNTY OF" or the like.

**Time box.** 1 hour

**Rules.** player-screen-text: no raw record text on a screen. One rule, all 56 places: the name comes from the listing in every place.

**Done when.** `src/core2/treasury-names.test.ts` passes on two drawn places, and in the running game on main an Advanced start as a county officeholder in a drawn place shows the county in ordinary capitals on "You".

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts, src/core2/government-jurisdictions.ts, src/core2/treasury-names.test.ts
