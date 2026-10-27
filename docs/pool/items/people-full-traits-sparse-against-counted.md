---
id: people-full-traits-sparse-against-counted
title: "Full people carry far fewer traits than counted people, so the two tiers choose differently"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Found on drives-displaced-prove-oneself-over-band: a full person's trait map holds about 16 keys on average against about 98 for a counted person, and the shared chooser reads a missing trait differently from a present one, so full and counted workers facing the same job loss answer it at different rates (North Canton, Ohio, 3956294, seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c: 18 of 32 full against 20 of 71 counted set out to prove themselves; Steamboat Springs, Colorado, 0873825: 41 of 89 against 5 of 236). A town's displaced-worker rates then swing with its share of full people. Find where full people's traits are generated sparsely (or where src/core2/choice.ts kindLean reads an absent trait) and make both tiers carry and read the same traits.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count; a rule or data shape that differs by tier is an unregistered placeholder. No dice.

**Done when.** In North Canton, Ohio and Steamboat Springs, Colorado (seeds above) and two more drawn places, full and counted displaced workers choose prove-oneself at rates within two standard errors of each other, named with counts, and full and counted people's trait maps hold the same keys; src/core2/drives-economy.test.ts passes unchanged. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/choice.ts, src/core2/person-state.ts, src/core2/modules/residents.ts

**Notes.** TODO
Analysis (claude pool worker, Oct 27; released unbuilt, needs the traits lead's ruling). Measured in North Canton, Ohio (3956294, world seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c) at the opening: 1,770 living full people. By tier: calendar 1,573 hold 98 trait keys each, monthly 42 hold 98, weekly 133 hold 72.5 on average (49 to 74 for 93 of them, 98 for 40) and husk 22 hold 16. So "16 keys" is the husk tier's average and the sparse people are the weekly-tier opening cohort (the household members the opening generated, source "Generated opening cohort … place household mix"); the counted store holds all 98 for everyone. Where the sparsity is written: `openingTraits` in src/core2/population.ts (about line 484) writes the people-mind core values and the seeded traits, then at most `notableQualityRoom(age)` personality qualities from the upbringing (one for a child under 6, two under 18, three for an adult; src/simulation/people-traits.ts line 468: "The catalog stays sparse; every other scale reads as unknown, not as 'not like that'"). Where it is read: `kindLean` in src/core2/choice.ts (line 160) skips an absent trait exactly as it skips a trait at the middle (`raw === zero`), so an absent trait is the middle; the two tiers differ in what they carry (counted people hold a value, usually off the middle, on every facet; the opening cohort holds a few), not in how the chooser reads an absent key. Which is right is a design ruling, not a defect I can pick: either the opening cohort is filled out to the counted distribution (then a full person differs from their own counted twin only by history), or counted people's facets are thinned to the sparse rule. The 98-key counted store matches the 1,573 other full people (filled in from it), so the sparse group is the exception and about 7 percent of full people here. Neither the drives rates (18 of 32 full against 20 of 71 counted) nor the done-when's "within two standard errors" was re-measured; the sparse share (93 of 1,770) is too small to explain a swing of that size by itself, so look at who the displaced full workers are (opening cohort or filled in) before changing the generator. Searched docs for the sparse rule: only docs/design/old-core-retirement-map.md mentions it.
