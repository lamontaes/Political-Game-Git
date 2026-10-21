---
id: core-old-imports-town-households
title: "The town household builder reads the core's name, identity and age code, not the old engine's"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/old-imports-town-households
pr: #5031
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:27:23.831Z
---

**What.** The town household builder (`src/core2/town-households.ts`) imported the old engine's name drawing, identity generation, cohort given names, name corpus and world types. Read the core's own copies of each (`gov-rules/given-name-cohorts`, `gov-rules/names-data`, `gov-rules/person-identity`, `person-names`) and take the world as its seed and start date, so the file imports nothing from `src/simulation`. The old engine's two callers keep their behavior by passing the name corpus themselves.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine in `src/core2/town-households.ts` prints nothing, the typecheck passes, and the households' names, genders and birthdays for six drawn places and forty households each hash the same before and after (the PR body gives the hash and the seeds).

**Files.** src/core2/town-households.ts, src/simulation/living-world/town-residents.ts, src/simulation/story-people.ts

**Notes.** Built Oct 17 (claude/old-imports-town-households). The opening's world carries no place-names tag, so its name corpus is the national one; the two old callers that may hold a tagged world now pass `nameCorpusVersionForWorld` themselves.
