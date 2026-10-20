---
id: core-old-imports-tooling
title: "The opening tooling scripts read the core's legislation, rule-pack and state data, not the old engine's"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/old-imports-tooling
pr: #5032
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:34:22.508Z
---

**What.** Two tooling scripts under `src/core2/tooling/` imported the old engine for work that is already done: `build-opening-schools.ts` read one type from the old institutions file, and the one-time port generator (removed) generated `place-lookup.json` once at port time from six old-engine sources. The schools script now defines the file shape it reads, and the one-time place lookup generator is deleted, since its data file is the product and nothing reruns it. The third script, `generated-world.ts`, releases the old World's history and checks, which the opening's old World still needs, so it moves with core-old-imports-population.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands, and a generator whose output is checked in and whose sources are being deleted is deleted too. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine in `src/core2/tooling/build-opening-schools.ts` and the one-time port generator (removed) prints nothing, the typecheck passes, rerunning the schools script writes `src/core2/data/opening-schools.json` with the same hash, and the place lookup and disaster tests pass on a drawn place and a random seed.

**Files.** src/core2/tooling/build-opening-schools.ts, src/core2/place-lookup.ts, src/core2/data/places/place-lookup.json

**Notes.** Built Oct 17 (claude/old-imports-tooling). The schools output hash is 3d803165f927020e before and after (first 16 characters of the sha256). `generated-world.ts` stays with core-old-imports-population.
