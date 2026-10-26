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
---

**What.** Found on drives-displaced-prove-oneself-over-band: a full person's trait map holds about 16 keys on average against about 98 for a counted person, and the shared chooser reads a missing trait differently from a present one, so full and counted workers facing the same job loss answer it at different rates (North Canton, Ohio, 3956294, seed 8a8c23de2f386de8944a7ea780e0004858517370b27b7434222d447aeebaf97c: 18 of 32 full against 20 of 71 counted set out to prove themselves; Steamboat Springs, Colorado, 0873825: 41 of 89 against 5 of 236). A town's displaced-worker rates then swing with its share of full people. Find where full people's traits are generated sparsely (or where src/core2/choice.ts kindLean reads an absent trait) and make both tiers carry and read the same traits.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count; a rule or data shape that differs by tier is an unregistered placeholder. No dice.

**Done when.** In North Canton, Ohio and Steamboat Springs, Colorado (seeds above) and two more drawn places, full and counted displaced workers choose prove-oneself at rates within two standard errors of each other, named with counts, and full and counted people's trait maps hold the same keys; src/core2/drives-economy.test.ts passes unchanged. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/choice.ts, src/core2/person-state.ts, src/core2/modules/residents.ts

**Notes.** TODO
