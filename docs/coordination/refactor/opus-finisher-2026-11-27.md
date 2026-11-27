# The Opus finisher: plugging every engine into the core (draft, Nov 27, 2:20 a.m.)

The owner, Nov 27: "I'm expecting this to be the final big refactor / rewriting of the game before early access. So be sure everything plugs in and... is good to go for Opus tomorrow." The owner, Nov 26: "Opus will go through, run the tests, do the fixes, and then plug it into the core, and then it'll be done."

The CTO keeps this page current overnight. The Opus session reads it first, then the nine maps in this folder: story, core, people, screens, elections, offices, lawmaking, economy and world.

## The engines when the builders finish

| Engine (family)                                        | Map                     | Builder session                                                         |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------- |
| core                                                   | core-2026-11-26.md      | Core                                                                    |
| story (director and English)                           | story-2026-11-26.md     | Story and Story split                                                   |
| people, plus homes (housing)                           | people-2026-11-26.md    | People                                                                  |
| offices (seats) and governing (the officeholder's day) | offices-2026-11-27.md   | Offices                                                                 |
| elections                                              | elections-2026-11-27.md | Elections                                                               |
| laws and justice (the outcome web stays with laws)     | lawmaking-2026-11-27.md | Lawmaking                                                               |
| jobs-businesses, finance and budgets                   | economy-2026-11-27.md   | Economy, plus Past and Day One for jobs.ts, business.ts and the opening |
| clock-places, past and news                            | world-2026-11-27.md     | World, plus Past and Day One for the past files                         |
| screens                                                | screens-2026-11-27.md   | Screens                                                                 |

## The plug contract (Core items 6 and 10)

**One registry:** `registerModule`. A module carries everything it offers as fields on `CoreModule`:

- its history and its rows by id (`HistorySource.row`);
- its cash journal source providers;
- the readers that today are side registries.

People has 11, elections 8, offices 6, lawmaking 20, economy 13 and world 3. There are 74 `register*` functions game-wide, including the core's own.

**An engine is plugged in when:**

1. Every outside import of it goes to one of its entries in tests/guards/families.json. Its reach-in count is 0.
2. No engine opens another's module table. Core's engine-tables guard counts 0 for it, both ways.
3. No engine writes another's records. Core item 7's list is empty for it, including rows edited in place.
4. It registers through `registerModule` only.
5. Its files sit in its family, with no orphans and no test, kit, check or tool in src/.

## The order

1. **Core:** items 1 to 10, then 11 (the front door split and one folder per engine).
2. **Engines,** in the order their doors are needed:
   - offices and governing;
   - people and homes;
   - elections;
   - laws and justice;
   - finance, budgets and jobs-businesses;
   - clock-places, past and news;
   - story;
   - screens last, since it reads everyone.
3. **After each engine:**
   - `npm run typecheck`;
   - the guards (families, engine-tables, import cycles, determinism, the game-only pass and the line register), with baselines that only go down;
   - the full test suite;
   - the fixed-seed records digest, on three seeds, with any difference explained.
4. **The golden path in the installed game:** start a life, turn 18, meet people, file, campaign, election night, the morning after, then serve. Every stop is written down in the owner's words, then fixed at its cause in the engine that owns it.

## Questions the maps left open, to settle before plugging

- **Offices OF6:**
  - does a vacancy's appointee pick (`suitedResidents`) weigh the same reasons as `appointerWeighing`?
  - is any seat paid both by official-pay.ts and by office-day-pay.ts's stipends, or by public-payroll.ts?
- **Lawmaking LW2:** do group A's and group B's reach stores have the same row shape, so they can become one store?
- **Lawmaking:** world-legislating's `voteAtMeeting` and `outsideEnact`, against the legislature's vote machinery.
- **Economy:**
  - credit's links to jobs, before it joins finance;
  - act-cash.ts and cash-host.ts (Core item 3 decides).
- **Elections EL9:** serve-asks.ts's move to governing, once its imports are measured.
- **People P8:** who reads a demoted person's `counted:` place id as a place.
- **Seams between maps** for the all-maps review:
  - each door has one builder;
  - each consumer switches its own files;
  - families.json edits go in order: Story, Core, Screens, Elections, Offices, Lawmaking, Economy, World, People;
  - no family split raises a baseline (doors first).

## Settled overnight

- **World WO4:** community-events-table.ts is wired into the town's calendar as dated records (World, #10741), not deleted.
- **The world-build crash** (Wheeling, Missouri; Upham, North Dakota): the legislating reader listed bodies before its engine opened. Core's #10764 fixes it with a test.
- **Reach-ins' stack (#10701)** carries the train once, at 850cc6b1 (the merge three sessions each made identically, plus a one-line test import fix). Anything stacked on it branches from that head.

## Known reds before plugging (Nov 27, 5:19 a.m.)

Read these first, so a red the finisher sees isn't mistaken for its own:

- **main's housing red** (known since Nov 26).
- **main's ui-look crash at some places** (`page.evaluate: ... reading 'setAttribute'`; Charlo, Montana, on main; Redford, Texas, on the train). Screens is fixing it.
- **school-outcomes at Hackleburg, Alabama** (seed 5d329c70fa987cb9): a household income of 9.5 million from one job. People is checking whether main has it too.
- **Out of the train:** #10687 (the century runs the town's offices), undone by 40277cbf. Its test fails at Marana, Arizona, and its past local races cite century records that don't exist. Its fix starts by reverting 40277cbf.
- **On #10701's merged head:** legislature-rooms, president-orders, liked-lines-kept (127 lines) and import-cycles (1198 edges against 1191). Core is fixing them at their cause, with no baseline raised.

## The record of tonight

- The decisions: cto-notes/overnight/2026-11-26-log.md, under "What I decided as you".
- The trains: #10699 (train/nov27-a) and #10701 (Reach-ins' stack).
- The talking rules: check-in.md, "Talking". The crew thread is #10377; the backup is #10703.
