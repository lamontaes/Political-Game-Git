---
id: housing-filled-in-officials-have-no-home
title: "Officials filled in from another state's office have a household but no home: 45 households without a dwelling at the opening"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead T45, Nov 14 2026, red on the clean train 998ba95bf5 and on #9084 alike
---

**What.** At the opening, every officeholder filled in from another state's or territory's office (one governor per state and territory, 45 in Burnet, Texas, replay 6e32d4b3c4eb3d6e, and again at replay 2925bf019bedef90) has a full household and no `dwelling:<household>` row in housing. Each one's household is `household:official:term:seat:US-<state>:governor:2025-01-20`, placed at the state (US-AR, US-AZ and so on). Nothing pays their rent or mortgage, nothing holds their home's value, and a scene at their home has no room to read. `src/core2/housing-ready-at-opening.test.ts` fails on the train for this reason ("opening homes exist before first advance: expected [ …(45) ] to deeply equal []"). Seen: in dev mode, open another state's governor (for example from the national news or the governors' list) and go to their home; the home has no condition, value or tenure.

**Cause.** Measured: Burnet TX, seed 6e32d4b3c4eb3d6e, 940 full households, 45 without a dwelling, all `household:official:…`, one for each state and territory other than the town's own. Found in code: `fillInIdentity` (src/core2/state.ts, around line 2704) makes the household `household:<identity id>` at the identity's place (the state), and `openHousing` (src/core2/modules/housing.ts) opens dwellings only for the places housing keeps stock for, so a household placed at a state code gets none. The housing engine has no later hook for a household made after it opens.

**Fix.** Give a filled-in household a home through the housing engine's own rule for a household that arrives, at the state's sourced rent and value and tenure share for the official's age, not a second home writer. Pick the existing path housing uses for a household that moves in after the opening; if none fits a household outside the stock's places, register a stopgap naming the engine that should own it.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a filled-in official is housed by the same rule as any household. One rule, all 56 places: the state's figures come from data, never a named state. Wire to the world: the home's rent or mortgage is paid from the household's money.

**Done when.** A second session builds a drawn place on main, naming place and seed, and sees `housing-ready-at-opening.test.ts` pass, and in dev mode opens another state's governor's home and sees its tenure, value or rent.

**Waits on.** Nothing.

**Files.** src/core2/state.ts, src/core2/modules/housing.ts, src/core2/housing-ready-at-opening.test.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
- Same fault, second path (T44, #9080, Nov 14): `offerNewcomer` in src/core2/modules/voting.ts fills in a newcomer offered as a governor's running mate through `fillInIdentity`, with a household at their drawn home town and no dwelling. One who is picked and wins holds office with no home. Fix both paths with the one housing rule. See also gov-officials-home-town-in-district.
