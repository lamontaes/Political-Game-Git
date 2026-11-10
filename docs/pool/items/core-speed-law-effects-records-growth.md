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
---

**What.** Four years of Upper Witter Gulch (key 0879800, seed 5a1c0de7a11ce5e1, speed:year --exclusive) on Nov 8 main: year 1 keeps 404,109 records (most in core2-law-effects-v1.applied), year 4 takes 118.8 to 128 s with 962,745 records and 4.5 GB process. The Nov 4 code kept 178,878 records in year 1 and ran year 4 in 95.2 s with 745,850 records. The table is named but not the writer or its reader. Find which commit added the rows and what reads them; the host is now src/core2/law-reach/host.ts (LAW_REACH_HOST_ID core2-law-effects-v1) with applied.ts.

**Cause.** Needs cause. Looked at: the item, src/core2/law-reach/host.ts line 35 (LAW_REACH_HOST_ID) and src/core2/law-reach/applied.ts (no per-row reader checked). Measured by State Sessions Nov 8: Upper Witter Gulch (0879800, seed 5a1c0de7a11ce5e1) year 1 keeps 404,109 records.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the rows dropped are deleted, not left beside a new copy. An effect is a read, not a record: a row no other engine reads at the moment it decides or pays is dropped once it posts. One run, one number: the records proof must stay identical in every table but the one dropped.

**Done when.** A second session, not the builder, runs `npm run speed:year -- --place 0879800 --seed 5a1c0de7a11ce5e1 --exclusive` and names the commit that added the law-effects rows and the engine and file that reads them, by record id, with year 1's record count; this item is then rewritten with Found in code and a Fix.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/host.ts, src/core2/law-reach/applied.ts

**Notes.** Measured by State Sessions Nov 8; the garbage collector is 25% of year 4, and Montpelier's year-4 memory shares the cause.
