# M1-other-places: the rest of the country, at a coarser level

**Contract:** M1-13 in `docs/roadmap/features.json`, narrowed by the owner (Oct 10): other councils and legislatures passing measures move to M3-10, which already promises them, and news delivery moves to M2-09, which already promises it. **Narrowed test:** in a year, other places' populations and voters' views change from their own conditions within real ranges, and their public events are recorded with place and date so news (M2-09) can carry them to the player with delays.

**Builder:** a new Codex session, CODEX-OTHER-PLACES, at **medium**: an aggregate tier over modules that already exist.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-other-places`, stacked on `pool/M1-regional` with `pool/M1-views` and `pool/M1-renewal` merged in locally. **Starts:** when those three are on their branches.
**Owns:** `src/core2/modules/places.ts`, `src/core2/places-*.ts`, `src/core2/data/places/`, and their tests. Read `M1-common.md` first.

## What it is

The player's town and county run in full daily detail. Every other place (every other town in the state, every other state, the territories) runs as aggregates: population by age, households, jobs, and voter groups carrying views, stepped on calendar dates (monthly or quarterly), never person by person. Named people who live elsewhere (officials, relatives, people the player has met) stay individual records.

## What exists

- **Old core:** built around the player's town. Other states' statewide races come from 2024 results plus a lean (`src/simulation/world-setup/statewide-electorate.ts`); local governments come from the Census unit list (`nationwide-world/local-governments.ts`). No engine moves other places' populations or views.
- **New core:** one town. M0's voter groups (`src/core2/voter-groups.ts`) are the coarse tier's unit; M1-views extends them with values; M1-regional supplies each region's economy; M1-renewal supplies real birth and migration rates.

## Research first

Mostly done by the work orders it stacks on. Add Census population estimates by county and place for the start date (with Puerto Rico's municipios and the territories), and each place's recent rate of change, as the check.

## Build

1. **Tables.** Register module `places`: each place's aggregates (population by age band, households, jobs by industry from its region), its voter groups, and its recorded public events. Index by place and by date.
2. **Population** moves by the place's real birth, death and migration rates, adjusted by its region's economy (people leave places losing jobs), on a quarterly calendar step. Moves between the player's town and elsewhere stay consistent with M1-renewal's individual moves.
3. **Views** in each place's voter groups shift from that place's conditions (its region's jobs and prices, big events there) through M1-views' group rules, with causes recorded. A big event in one place shifts that place's groups and no others.
4. **Public events elsewhere** (a large closure, a disaster, a big layoff) are records with place, date and who it touched, ready for M2-09's news to carry, with delays, to people who would hear of it.
5. **Officials and relatives elsewhere** remain full people (M1-officials, OPUS-PEOPLE) and read their place's aggregates as their conditions.
6. **Bench:** a map table of places with their population, jobs and voter-group views over the year.

## Out of scope

Other councils and legislatures passing measures (M3-10), news delivery (M2-09), elections elsewhere (M2-10), and individual simulation outside the focus places.

## Hand-off

The finisher runs a year in a random place: three other places' populations change within their real one-year ranges; a large event in one place shifts only that place's voter groups, with causes; and the event record is there, dated, for news to pick up.
