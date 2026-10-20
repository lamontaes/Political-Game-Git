---
id: core-officials-deep-past
title: "The president, governors and members of Congress have no life before office: no childhood, school, family or career, only a name, a party, a home state and a prior office"
area: core
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/officials-deep-past
pr: #5156
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:41:47.237Z
---

**What.** The president, governors and members of Congress were filled in with a name, a party, a home state and a prior office and nothing before that: no childhood, no school, no era. Fill every named person in whole when they are filled in, with the childhood, schools and era the opening gives everyone, built from the world's seed and their birth so the same person comes back the same every time. Family and career before office stay for a later item.

**Rules.** Two-level population: a named person is filled in whole and a filled-in person must match what the records already say about them. No dice: the past is built from the seed and the birth, never rolled per run. Speed: the past is built once, when the person is filled in.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, every seated official has a birth date, school cohort, era and childhood household fact besides their party and seat, shown by person record id, and a test in src/core2/officials-deep-past.test.ts states it; building the world is not more than a few seconds slower.

**Files.** src/core2/state.ts, src/core2/deep-past.ts, src/core2/officials-deep-past.test.ts

**Notes.** Body written Oct 19 from the title. Built in fillInIdentity (state.ts), which every named person passes through. Not built: parents and siblings, and the job history before the prior office.
