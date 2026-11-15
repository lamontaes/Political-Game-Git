---
id: core-speed-law-effects-records-growth
title: "Year 1 keeps 404k records on main against 179k on Nov 4; most are law-effects rows"
area: core
kind: cleanup
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #7348
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Four years of Upper Witter Gulch (key 0879800, seed 5a1c0de7a11ce5e1, speed:year --exclusive) on Nov 8 main: year 1 keeps 404,109 records (most in core2-law-effects-v1.applied), year 4 takes 118.8 to 128 s with 962,745 records and 4.5 GB process. The Nov 4 code kept 178,878 records in year 1 and ran year 4 in 95.2 s with 745,850 records. The table is named but not the writer or its reader. Find which commit added the rows and what reads them; the host is now src/core2/law-reach/host.ts (LAW_REACH_HOST_ID core2-law-effects-v1) with applied.ts.

**Cause.** Measured: Alamogordo, New Mexico (3501780), the world `npm run speed:year -- --seed t1` builds, on the train at df168042e6, with a scratch script (not committed) that grouped the rows of `core2-law-effects-v1.applied` by law, engine and kind at the opening and after each quarter. The table holds one row for each law and each target, and a counted household record is a target of its own, so the rows grow with the households, not with the laws. It holds 15,254 rows at the opening, 55,711 after one quarter and 68,345 after a year. Five families write 52,000 of them, nearly all for counted households: voter registration, two rows for every counted household from the first day (7,717 each for automatic and same-day registration, src/core2/modules/voting.ts); the three Social Security ages, three rows for every household with someone near a claim (4,006 counted and 925 named for each of the three series; commit 948c269d4db, Nov 8); Medicare drug prices on medical bills, 10,427 rows rewritten 117,237 times in the year (commit 39b3a4aba4e, Nov 8); the property tax bill and its growth cap, 3,759 and 2,818; and loan quotes under the rate cap, 4,586 rows rewritten 57,903 times. The two commits of Nov 8 are the rows that appeared between the Nov 4 and Nov 8 measurements in What: 25,220 rows here. The readers are two, both in the bench: the law's "what it did" read (src/bench/law-did.ts) and dev mode's bill card (src/bench/dev-mode.ts), through `lawReach` (src/core2/law-reach/applied.ts), which gives people and dollars by law and the named people's list.

**Fix.** Keep a row for each named person, as now, and fold counted targets: one row for each law, engine and kind in a place, holding the households and people it stands for and the money moved, added to on each application. `lawReach` reads the same people and dollars from it. That takes this table from about 68,000 rows to a few thousand here and removes most of its rewrites. Before building, check that nothing reads one counted household's own row (a fill-in, a repeal that ends rows by target): that was not traced. A change of what is kept, so it needs the records proof read table by table and the bill card compared before and after, not an identical digest.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the rows dropped are deleted, not left beside a new copy. An effect is a read, not a record: a row no other engine reads at the moment it decides or pays is dropped once it posts. One run, one number: the records proof must stay identical in every table but the one dropped.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 --exclusive` and names the commit that added the law-effects rows and the engine and file that reads them, by record id, with year 1's record count; this item is then rewritten with Found in code and a Fix.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/host.ts, src/core2/law-reach/applied.ts

**Notes.** Measured by State Sessions Nov 8; the garbage collector is 25% of year 4, and Montpelier's year-4 memory shares the cause.

**Notes (Fable B, Nov 15).** The year's other large tables at Alamogordo, from the same world's speed receipt: `core2-campaigns-v1.doors` 54,679 and `core2-coverage-v1.countedCoverage` 41,661. Not measured: Upper Witter Gulch itself, and the seconds this table costs (the profile of this year puts 25 seconds in the table store as a whole).
