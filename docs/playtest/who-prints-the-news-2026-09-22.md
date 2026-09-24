# Every town in America already has a newspaper. One place does not.

**Measured:** 2026-09-22, branch `claude/playtest-cwpd3o` at `cff96b8f`, ten
towns in ten jurisdictions, through `prepareOpeningLife` → `generateOpeningLife`
→ `openOrdinaryLife`, reading `mediaOutlets(world)`.

lamontae, 2026-09-22: _"How many newspapers are there? Okay, in eight towns.
This is unacceptable. This needs to be nationwide."_

## The answer is that it already is nationwide, with one hole

| Town                      | Outlets | The local one                   |
| ------------------------- | ------- | ------------------------------- |
| Bemidji, Minnesota        | 4       | Bemidji Community Report        |
| Galena, Illinois          | 4       | Galena Neighborhood Newsletter  |
| Paducah, Kentucky         | 4       | Paducah Community Report        |
| Hannibal, Missouri        | 4       | Hannibal Community Report       |
| Sitka, Alaska             | 4       | Sitka Civic Bulletin            |
| Houston, Texas            | 4       | Houston Community Report        |
| Chicago, Illinois         | 4       | Chicago Neighborhood Newsletter |
| Reno, Nevada              | 4       | Reno Civic Bulletin             |
| Helena, Montana           | 4       | Helena Civic Bulletin           |
| **San Juan, Puerto Rico** | **3**   | **none**                        |

Nine towns in nine states, none of them curated, every one of them handed a
newspaper named after itself. The name is generated: `ensurePressLocalCoverage`
in `src/simulation/press/outlets.ts:295` takes the place's own short name and
draws a form from `LOCAL_NAME_FORMS` — Community Report, Neighborhood
Newsletter, Civic Bulletin. Nothing about this is a list of eight towns.

So the eight-town number is not the newsrooms. It is most likely the census
filing labels that were appearing as party names in eight towns, which was a
different defect of mine and is already fixed and merged (#378). Two findings
about "eight towns" is one too many, and they are not the same eight.

## The hole is Puerto Rico, and it is the shape of every other Puerto Rico gap

San Juan gets three national outlets and no local one. The reason is one line
above the name generation:

```ts
const local = homeLocalGovernmentStatus(world, residentPersonId);
if (local.governments.length === 0) {
  const state = homeStateJurisdictionId(world, residentPersonId);
  return state ? ensurePressStateCoverage(world, state) : world;
}
```

A newsroom follows a **municipal government**. Puerto Rico is seated with
geography and no government, so there is nothing for a community reporter to
cover and no paper is created. This is the engine behaving correctly on a
jurisdiction that was never finished, which is the same shape as Puerto Rico
having no legislature pack and no qualification rows. Fixing the press here
means fixing the government, not the press.

## What nobody has: a state paper

**Zero state-scope outlets in all ten worlds.** Every town's four are one local
and three national. `ensurePressStateCoverage` exists and is written, and on
this route the only thing that calls it is the Puerto Rico fallback above —
which then produced no state outlet either, so that path wants looking at.

That means there is no capitol press corps anywhere in the game. A governor's
race, a state legislature and a state budget are all covered, if at all, by a
community newsletter and three national desks.

## What this does not settle

- **What they print.** This counts newsrooms, not stories. The separate finding
  that newspaper prose is the event's own internal summary field — so the
  national outlets print one sentence word for word — is recorded elsewhere and
  is not re-measured here.
- **Whether a player can reach any of it in these towns.** This reads the world
  the opening route builds. It is not a walk.
- **The other 35,572 places.** Ten towns agreeing is a strong prior that the
  generation is general, because the code has no town list in it, but ten is
  ten.

## Method note, because the first measurement was wrong

A first pass built each world with `createNewGameWorld` directly and reported
**zero outlets in every town, including Chicago**. That was the instrument, not
the game: the press opening, like the macro economy, is written by
`generateOpeningLife` and not by `createNewGameWorld`. A confident "there are no
newspapers anywhere in America" was one report away. Build the world the way the
player's route builds it, or measure nothing.
