---
id: world-bank-takes-applications-from-outside-its-town
title: "The town bank takes personal-loan applications from households that live elsewhere"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: T54
pr: 9457
blocked-on:
source: "measured by T54 for the Account lead's bank-room question, Nov 15"
claimed-at: 2026-11-15
after:
root: none
lead: money
model: sonnet
effort: medium
---

**What.** Every household in the world, wherever it lives, applies to the played town's bank for a personal loan each month. The state and federal officials and aides filled in as full people (they live at the capital or in Washington) take most of the town bank's household room, so the town's own households are turned away. Seen: the town's households are refused loans the bank would have made; officials elsewhere carry the town bank's loans.

**Cause.** Measured: Matagorda, Texas (4847016, the seed `drawPlace("pt1:0", "path-check")` gives), opening Jan 20, 2025, to Mar 1: 129 personal applications asking $478,526, of which 89 ($344,107) came from officials and aides whose household lives outside the town. Gratz, Kentucky (2132428, the seed `drawPlace("d4", "home-price-paths")` gives): 77 asking $223,275, 56 of them ($182,052) from outside. Found in code: `borrowingHouseholds` in src/core2/modules/credit.ts lists every full and counted household with no place, and `householdApplications` asks the bank for each; only the storefront lender checked the household's place.

**Fix.** `borrowingHouseholds` takes the bank's place and lists only that place's households; the storefront lender, in the same town, no longer needs its own place check. The player sees the town's households get the loans the bank can make.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places; no dice; replace, never layer.

**Done when.** A second session builds a world at a place and seed it draws, plays to Mar 1, and sees every personal application in `credit.applications` name a household whose place is the bank's place, by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts; src/core2/credit-applicants-place.test.ts (new)
