---
id: core-officials-deep-past
title: "The president, governors and members of Congress have no life before office: no childhood, school, family or career, only a name, a party, a home state and a prior office"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/officials-deep-past
pr: #5156
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:41:47.237Z
---

**What.** The town's households get a deep past at the opening and on fill-in (`src/core2/deep-past.ts`, `past-family.ts`): school, how partners met, children, jobs, remembered moments. Officials made by `src/core2/modules/officials.ts` (president, vice president, governors, members of Congress, state officers outside the town) get only an identity through `fillInIdentity`: name, birth date, party, home state, seat and prior office, at tier "calendar". A one-year life page of the president (seed life-1, Marseilles, Ohio; Pamela Donovan, `official:term:seat:US:president:2025-01-20`) shows 16 past facts, all from January 20, 2025 or the 2024 campaign, no family and no one known. The owner (Oct 19): "What about the president's past as well, like growing up? ... that's why I say the world is simulated before."

**Rules.** One model, two tiers: an official filled in is a consistent full person like any resident. Two-level population: an official is a named person and a full person. Build their past with the same rule the town's households use, from their home state's records (school, hometown, family, career leading to the prior office the record already names), seeded from the world so the same person comes back every time. It must match what the records already say (party, prior office, home state, age). No second past generator; extend the deep past's entry so it takes a person outside the town. Build it when the person is filled in (watched, met or clicked), not for all 1,500+ officials at the opening, to keep speed.

**Done when.** In a one-year run of `buildBenchWorld` on a seed the builder did not choose, the president and one governor each hold childhood, schooling, family (a household with named relatives where their age and record fit) and a career ending in the recorded prior office, and the director's journal or a scene reads one of those facts by record id.

**Files.** `src/core2/deep-past.ts`, `src/core2/past-family.ts`, `src/core2/modules/officials.ts`, `src/core2/state.ts` (`fillInIdentity`).

**Notes.** Seen with `scripts/dialogue-batch/life-page.ts` (on `words/word-pack`): `npm run words:life -- --id life-1 --seed life-1 --role president`.
