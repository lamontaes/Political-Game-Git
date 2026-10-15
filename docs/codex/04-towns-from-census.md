# Job 04: towns built from census counts

## Why

In Build 12's watched run, Catawba County, North Carolina had its population "set by hand" at 1,000, because the world report found no census count, and only 36 people were in the labor force. Lamontae: "This needs to be fixed... a realistic variance, but use census records to get close." Tiny, hand-set towns are also one cause of unemployment blowups: one lost job moves the rate 3 points. A place with population 0 (Concho) showed up in a world run.

## Work

1. **Research, done once for all 56 places and every place kind the game opens.** Kinds include incorporated places, census-designated places, counties used as the watched place, and territory places. For each, collect:
   - total population;
   - households;
   - age bands;
   - labor force and employment;
   - race and ethnicity;
   - language;
   - owner and renter shares.

   Sources:
   - the 2020 Decennial Census and the latest ACS 5-year tables, through the Census API or bulk downloads (no key is needed for modest volumes; say so if a key is needed);
   - for territories, the 2020 Island Areas census.

   Store it as generated data next to `src/simulation/nationwide-world/place-population.generated.ts`, extending that file's pattern, with the source and vintage on each row.

2. **Every world starts from those counts with a realistic spread.** The spread is per world and stays deterministic for a seed. It is sized from the real year-to-year change in comparable places, not a fixed percent. Nothing may be hand-set. Nothing may be 0 unless the real count is 0, in which case the place is not offered.
3. **The represented population.** A town simulates named residents, a sample. Every statistic the game shows (unemployment, poverty, turnout) must be computed so that it represents the whole population, not the 36 people written out. Two choices; pick the one that keeps the speed budget:
   - simulate more named residents where the town is small;
   - keep a population layer (households by kind) that the named residents belong to, with the rates coming from that layer, the named people being consistent with it.

   Say which one you chose and why in the hand-back.

4. **The world report reads the census counts** for its VITAL STATISTICS, and states the represented population next to the written-out count.

## Checks

- Watched worlds in 3 random places of different sizes (under 2,500 people, a mid-size town, a big city), plus one territory place. In each:
  - population, households and labor force within the real count's spread at the start;
  - realistic drift over 5 years;
  - an unemployment rate that doesn't swing more than real places do.
- The speed budget applies.
