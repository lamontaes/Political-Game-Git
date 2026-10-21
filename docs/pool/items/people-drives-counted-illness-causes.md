---
id: people-drives-counted-illness-causes
title: "A counted person who falls seriously ill, and their household, perceive it by the same rule as named people"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When someone in the wider population falls seriously ill (births-counted.ts), no event is recorded, so neither they nor the household they live with perceive it. A named person and their family perceive a serious illness through the serious-illness rule in drives.ts and may take up a cause. Record a counted onset as a private event of its own kind naming the ill person as its counted subject and their household, and have each respond by the same rule, read from their counted records. A cause they take up is kept until they are filled in.

**Rules.** One model, two tiers: a counted person and their household perceive a serious illness by the same roles, channels and responses as named people, read from their own records. No dice: whether one takes up a cause comes from their traits and the event, never a roll.

**Done when.** In a one-year buildBenchWorld played world in a place drawn from all 56 (seed named), counted onsets are perceived by the ill person as subject and their household as family or household, each scored by the shared rule with record ids, and a cause taken up from one is held after fill-in, shown by a test in src/core2.

**Files.** src/core2/births-counted.ts, src/core2/modules/drives.ts, src/core2/data/drives.json, src/core2/data/health.json

**Notes.** Split from people-drives-counted-tier-causes. Built stacked on the bereavement wiring (#5821).
