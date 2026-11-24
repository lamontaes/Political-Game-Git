---
id: elections-page-row-says-file-for-it-after-the-player-filed
title: "The Elections page row still says File for it after the player has filed"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Account lead played walk, Nov 16, 2026 (run-for-office-played.md, Millville PA and McMinnville TN on Train 6d12556a)
---

**What.** After a new player files, the race page drops its File for it button, but the row for that office in the left list still reads File for it. The player is told the office is still theirs to file for when they have already filed. Seen: at Millville, Pennsylvania the day after filing on January 21, 2025, and at McMinnville, Tennessee after filing on June 23, 2026, the Council member row read File for it.

**Cause.** Found in code: the row's aside in `src/bench/play.mjs` (the Elections page's own-offices list, near the `labels.fileForIt` use) shows File for it whenever `race.playerMayFile && race.filingOpen`, and reads the filed state (`filed.has(race.contestId)`) only for rows with no such ask.

**Fix.** Make the row's aside in `src/bench/play.mjs` read the player's own filing first and show the filing's status (the words `status(race)` already gives) instead of File for it once the player has a filing for that contest; no second rule, the filing record is the one source.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Wire to the world: the row reads the same filing record the race page reads, so the row and the race page never say different things.

**Done when.** A second session plays a drawn place, Millville PA (`drawPlace` of the place key 4249944 with any seed), on main by presses only and sees the Council member row no longer reading File for it after the player files at the county board of elections, and the race page and row agreeing.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs

**Notes.** Account lead, Nov 16. The walk and its screenshots are in /mnt/project-files/account-lead/reports/run-for-office-played.md.
