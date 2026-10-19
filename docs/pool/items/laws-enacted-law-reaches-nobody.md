---
id: laws-enacted-law-reaches-nobody
title: "An enacted town law took effect and no engine read it (Meadow Lakes, Alaska, seed f835dd278d7312a1)"
area: laws
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/law-reaches-nobody
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T20:43:48.638Z
---

**What.** In Meadow Lakes, Alaska (seed f835dd278d7312a1) an enacted town law took effect and no engine read it, so nobody in town was reached. Find which law family it belongs to, why no handler read it, and make the family's engine read the law row at the moment it decides or pays. Check that no other enacted town law reaches nobody.

**Rules.** An effect is a read, not a record: a law has an effect only when a different engine reads it at the moment it decides or pays. The chain is the acceptance: follow the law to a payment or price that changed and a person it reached.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Meadow Lakes, Alaska with seed f835dd278d7312a1 and in one other drawn place, every enacted town law that took effect is read by an engine named by record id, one dollar or rule is followed to a named person, and a test in src/core2/law-reach-balance.test.ts states it.

**Files.** src/core2/law-reach/index.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
