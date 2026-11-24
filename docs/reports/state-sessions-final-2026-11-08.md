# State Sessions: final report, Nov 8, 2026

**What a player gets now.** Every state, the District of Columbia and the territories hold their own legislative sessions while the player plays, and a law passed in another state changes that state's law, never the player's town. The News screen has a Nation heading that tells the laws of other states that matter to the reader. A new game opens in every place I tried.

## What I proved, with places and seeds

- **Other states pass laws.** `src/core2/state-sessions.test.ts` plays one year from a place and seed drawn at random and requires at least 40 states with enacted laws. It also checks each law's id carries its own state's key, each has chamber counts and a signed or overridden decision, and none landed in the town's own law levels. It passed on main on Nov 8. A fresh run the same day, King Salmon, Alaska (0239630), replay seed 760ce56c94278477, found 54 governments with 498 laws, for example `law:US-MN:state:us-policy-positions:housing-land-use.right-to-counsel-in-eviction:general:2025-08-01:2025-1` (chambers 132-2/67-0, signed). The Nov 5 report `state-sessions-year-proof-2026-11-05.md` lists 54 of 56 places (Peterstown, West Virginia, seed f5c68356…). Alaska's own legislature and Pennsylvania were not in the Nov 8 list; I did not check why.
- **A law elsewhere is that state's own.** The same test, and the tests for state bars, county bodies, wage floors and federal mandates added during the law-levels work.
- **New games open.** The eight-place check passed on Nov 8 (base seed f794f5093795c13a): Silver Springs Shores, Florida; Beaver Dam, Kentucky; Texas City, Texas; Woodruff, Utah; Manchester, Tennessee; Blue Eye, Missouri; Woodbury, Kentucky; Lucky, Louisiana. Each built and played 30 days.

## Speed and memory, before and after

Upper Witter Gulch, Colorado (key 0879800, seed 5a1c0de7a11ce5e1), four years, one process at a time:

|                           | Before                       | After                                                                           |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Year 1                    | 51.7 s, 404,109 records      | 37.6 s, 313,021 records (other states' officials counted, #7359)                |
| Year 4, the election year | 118.8 to 128 s on clean runs | 110.7, 112.4 and 104.9 s (strangers' campaign records kept as a summary, #7367) |

Every year of the three runs was under 120 s. Earlier clean runs of the same code were 121 to 128 s, so about 5 percent of the year is the machine.

Montpelier, Vermont (key 5046000), four years:

| Seed                          | Years                  | Result                             |
| ----------------------------- | ---------------------- | ---------------------------------- |
| 5a1c0de7a11ce5e1, main before | 105, 260, 197, 1,012 s | finished, 7.7 GB (heap limit 8 GB) |
| 5a1c0de7a11ce5e1, with #7367  | 103, 252, 249 s        | ran out of memory in year 4        |
| 7e57ab1e0000beef, with #7367  | 111, 294, 164, 357 s   | finished, 6.1 GB                   |

The bar (under 300 s for each year) is not met in year 4.

Where the time went (all measured, notes in the pool item): about a quarter of year 1 was other states' officials, now counted until the player knows them. A speech's audience is 9 percent of the election year, and no one call in it is above 0.7 percent, so listeners cannot be grouped without changing someone's result. In Montpelier's election year the campaign rewrites the same voter-and-candidate impression rows about 2.3 million times (endorsements heard 953,792; retold statements 626,250; events about 400,000; mail 213,081; ads 101,002), and the relationship rows come from ordinary daily life.

## What is left, with the pool item for each

- **Montpelier's election year over 300 s, and out of memory on one seed.** `core-speed-montpelier-snap-scope-memory`. Two cuts tried and reverted (a circle rule for folded causes, a door-contact rule); neither moved the totals. The writer counts above name the next place to look. A dedicated Speed session takes this over.
- **Records growth in year 1.** `core-speed-law-effects-records-growth`: year 1 kept 179,000 records on Nov 4 and 313,000 now (404,000 before #7359). The cause was every other state's legislature sitting (#7290); the officials are now counted, the rest is law-effects rows and budget rows.
- **Officials of other states are built when asked.** `gov-outside-officials-built-on-demand`: today they are named at the opening and paid only after the player knows them (stopgap `SG-GOV-outside-officials-counted`, my choice under the CTO's Nov 7 order). Naming them only when asked is still 5.9 percent of year 1.
- **Step 4, a session moves what its floor time allows.** Dropped by the CTO on Nov 6 and left unbuilt. No pool item.
- **Paid-leave and sanctuary bars.** Need new catalog questions and statutes from each state's code. Dropped for now by the CTO. `law-levels-sanctuary-paid-leave-bars` was not filed as its own item.
- **Wage lists.** Montana and North Dakota are settled by statutes read in full (#7342). Nevada, Vermont and New Hampshire now bar towns as an estimate (Dillon's Rule), not by an express statute (#7368). New Hampshire's RSA 279 pages could not be read here. `law-levels-wage-lists-mt-nd-nh-nv-vt`. The Laws and effects session takes this over.
- **Nation story.** Built with a sourced population and border table (#7340). `SG-WORDS-nation-no-moved-from-tie` stays open: a person keeps no record of where they used to live.

## Pull requests of this stretch

Merged: #7340, #7341, #7342, #7343, #7344, #7346, #7348, #7349, #7351, #7359, #7360, #7361, #7367, #7368, #7385, #7394.
