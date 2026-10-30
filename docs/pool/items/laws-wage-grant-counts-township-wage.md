---
id: laws-wage-grant-counts-township-wage
title: "A wage-authority grant credits a raise only when the town's own wage is a city or county law, so a township's own minimum wage is never credited to the grant"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/law-reach/group-a-wages.ts:108 sets ownWage = governing?.level === 'city' || governing?.level === 'county'. The law-in-force rule (laws-in-force.ts:272, governing lead's governing/phase-in-dated-steps) now counts a township board's minimum-wage law as governing, as levelMayDecide already says a township legislates as a town does. So where a township's own wage governs, a raise under the state's local-wage authority grant is recorded as the floor's, not the grant's: the grant's reach misses the workers it raised. Seen by the governing lead in Richmond, Maine's Select Board (seed 998f152c4fa7583a).

**Rules.** One rule, all 56 places: a township's own law is a place's own law by the same rule as a city's, from the level the law row carries, never a named place. An effect is a read: the grant's applied rows must name the workers its raise reached. One engine per mechanic: the reach reads the one law-in-force answer's governing level, not a list of its own.

**Done when.** In a buildBenchWorld world drawn from all 56 where a township board governs (place and seed named), a state local-wage authority grant followed by the township's own wage law records the raised workers under the grant's applied row, by record id; a test in src/core2 proves it, and a city or county place still records them as before.

**Files.** src/core2/law-reach/group-a-wages.ts

**Notes.** Filed Oct 30 by the laws lead at the governing lead's request (its unit 3 made laws-in-force count township wages). Read: the governing lead's message; group-a-wages.ts on main 09:30 UTC.
