---
id: housing-state-line-rent-help-whole-state-in-one-town
title: "A state's housing line above its base pays all its rent help in the one played town"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #6219
blocked-on:
source: laws-effects lead, Oct 26 (helper's finding on #6011)
claimed-at:
---

**What.** payRentAssistance (src/core2/housing-assistance.ts) turns a government's whole housing line above its Census base into vouchers at the average voucher and pays them to the played town's renters. For a state government that is the extra for the whole state. In Rockville, Maryland (2467675, world seed c2acafc662419fbc...) the state's line stood 2,438,653,898 minor units above its base, 2,120 vouchers, all paid in a town of about 68,000 people in a state of 6.2 million, roughly a hundred times its share. The same rule pays a county's whole extra in one of its towns.

**Rules.** One model, two tiers, and one rule, all 56 places: a state or county line is shared across all its people, so the played town receives the part its own renters stand for. Estimate, never UNKNOWN: the town's share is its renters over the government's, from the place data the world already holds. No dice.

**Done when.** payRentAssistance pays a state or county line's extra in the played town only in proportion to the town's renter households against the government's (or its population share where renters are not recorded), sourced or ESTIMATED with its spread; a test in a drawn place whose state line is above its base shows the town's vouchers within that share, and the housing family test still passes on its named seed and one drawn place.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/housing-assistance.ts, src/core2/law-wiring-housing.test.ts

**Notes.** Laws-effects lead, Oct 26. Found by the housing helper while fixing #6011's family test; not fixed there.
Sent back 2026-10-27 from PR #6219 (branch claude/rent-help-town-share): the population-share stand-in for renter share has no stopgap row or code marker; finish on that branch, merge main into it first.
