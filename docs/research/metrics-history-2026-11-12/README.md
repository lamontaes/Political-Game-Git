# Metrics history from a real game (Nov 12, 2026)

Research for the Metrics tab (owner, Nov 12: "go with A plus the years table... use a real game and look at the history and make the metrics from that. i assume the history wont show because it never has"). Brief: `docs/coordination/briefs/2026-11-12-METRICS-HISTORY.md` on `cto/fleet-briefs-nov12b`. No game code was changed.

## What a player could see

The history does exist; the screen never asked for it. Over six played years the world kept the town's economy row every month, and the outcome web every month. It also kept the country's economy every month back to 2021, the state's economy every December, every government's budget every year, and crime, police, fires, the town bank and the President's approval every month. `src/bench/metrics.ts` reads only "now" and "the same month a year before" from these, and so no history has ever shown. A years table and a timeline can be built today for about seven in ten of the measures.

- **106 measures** were read after each December, 2025 to 2030: 74 town, 3 county, 13 state, 16 country (`history.json`; the three "fiscal year shown" rows are included).
- **Kept over the years in the records:** 87 come from a record that keeps its past: 63 town, 3 county, 7 state, 14 country. The other 19 have no past: 11 town (8 read live from an overwritten row, open claims, deaths with no date, and the town's own books, which this place lacks), 6 state and 2 country (the country tier's rows and the federal debt, overwritten).
- **Values that move:** 73 measures change across the six years; 32 hold one value every year. 23 of the 32 are town outcome-web measures that still sit on their 2024 starting figure because no running link moves them. Examples: overdose deaths, deaths at 55 to 64, traffic deaths, miles driven, transit, reading scores, school spending per student, homelessness, eviction filings, food help, gun homicides. Six are town counts that stayed at zero or unchanged (December business openings and closings, eviction orders and cases, rental homes, empty rentals). Three are the budgeted revenue at county, state and country level.

## The biggest gaps

1. **No year-by-year record of the town's people and homes.** Population (named and counted), rental homes and vacancies, open jobs, job seekers and open claims are read live and overwritten. The homeless count was written once, on 2025-02-01, and never again.
2. **The state has three kept figures**, from the regional engine's Decembers: unemployment, pay and jobs. The country tier's state figures (population, prices, sales) and the federal debt are kept for now only. There is no state or country figure at all for schools, health, safety or roads; those exist only for the town.
3. **Budgeted revenue never changes.** The county's, the state's and the country's budgeted revenue were the same dollar figure in every fiscal year from 2025 to 2030. Only spending moved.
4. **Deaths have no date and no count.** A named person's death leaves `alive: false` with no date. `core2-renewal-v1.counts` (counted births, deaths and illness by place a month) stayed empty all six years.
5. **This town has no government of its own in the records.** Gracey's books are the county's (County of Christian). A place with a city government would show its own.

Odd figures seen, not yet traced (for `ask-why` before a mock quotes them):

- The state's budgeted spending fell from $49.8 billion in FY2029 to $37.3 billion in FY2030, and the county's from $288 million to $252 million.
- The federal debt was exactly the same at the end of 2029 and 2030.
- The town's own school record shows spending per student of $344,636 for its one student in 2029, against the web's $15,455.
- Town unemployment reached 15% in 2029 (73 residents at work) while the state stood at 4.6%.

## The game

|             |                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place       | Gracey, Kentucky (place key `2132032`, `jurisdiction_5c53867f99d95a8c`), drawn from all 56; not one of the seen-set towns (Almont, Benndale, South Barre) |
| Run seed    | `metrics-nov12-a` (draw purpose `metrics-history`)                                                                                                        |
| World seed  | `ae9012e3c583d3853cd51b59bcc344415cdbd2a6f54ba8112abb09eef823c8b8`                                                                                        |
| World       | `buildBenchWorld` with every module, two-level population, bookkeeping off, as `npm run long-game` builds it; player `person_74f497fe54e4d492`            |
| Played      | 2025-01-20 to 2030-12-31, read on December 31 of each year                                                                                                |
| Main commit | `705081f6cffb780c2a59dfee1ef2e6a57b269596`                                                                                                                |
| Time        | 36 to 93 seconds a year; heap 754 MB rising to 1,350 MB                                                                                                   |

## Files

- `inventory.md`: step 1, every measure by area with its levels, record, unit, what is kept and what would have to be recorded.
- `history.json`: step 2, `{place, worldSeed, runSeed, years, measures: [{area, name, level, unit, source, kept, yearsWithValue, valuesOverYears, values}]}`, with null where the world had no figure. `historyStillHeldAtEnd` lists the months each kept table still held on 2030-12-31.
- `snapshots/year-YYYY.json`: the raw reading of each December, including every table's row count and the dates it spans.
- `probe.ts`, `extract.py`: the scripts (research tooling, not game code).

## Replay

```sh
git fetch --unshallow origin; git checkout 705081f6cffb780c2a59dfee1ef2e6a57b269596
# copy probe.ts and extract.py from this folder into docs/research/metrics-history-2026-11-12/
export OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"
npm install
node --max-old-space-size=8000 --expose-gc --import tsx \
  docs/research/metrics-history-2026-11-12/probe.ts --seed metrics-nov12-a --years 6 --out /tmp/metrics-run
python3 -I docs/research/metrics-history-2026-11-12/extract.py /tmp/metrics-run history.json metrics-nov12-a
```

The same seed gave the same 2025 to 2027 figures in two separate runs, apart from one: the first run counted a townsperson who died in 2027 among the named people, which the final probe does not.
