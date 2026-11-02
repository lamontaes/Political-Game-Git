---
id: laws-lobbying-bar-on-reelection
title: "A re-elected resident is barred from lobbying while still in office: seatWinner writes a term ended on re-election, and lobbyingBarredUntil reads it as leaving"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a re-election, seatWinner ends the serving term and seats the same person on a new term. lobbyingBarredUntil (src/core2/law-reach/group-a-voting.ts:617-629) reads the ended term as the official leaving office and starts the revolving-door bar. So a sitting resident who won again is treated as a former official barred from lobbying. Found by the laws lead's review of the speed lead's fold proposal (core-long-run-election-and-term-rows), Nov 2.

**Rules.** The law decides who is barred: the bar starts when a person leaves the office, read from the term records, never from a term that ended because the same person was seated again. One rule, all 56 places: the bar's length comes from each state's own law row.

**Done when.** In a buildBenchWorld world drawn from all 56 (place and seed named) where a resident officeholder is re-elected, lobbyingBarredUntil returns no bar for them while they serve, and returns the state's bar from the day they leave office, by term record id; a test in src/core2 proves it and fails without the fix.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/modules/voting.ts

**Notes.** TODO
