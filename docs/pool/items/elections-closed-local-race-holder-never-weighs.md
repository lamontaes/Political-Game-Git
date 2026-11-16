---
id: elections-closed-local-race-holder-never-weighs
title: "A local race whose filing closed before the world opens leaves its holder off the ballot, so the seat often has no one"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-incumbent-flag
pr: #9580
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (traced from two-level-elections at tl-c)
---

**What.** A world that opens after a local race's filing closed (a town, county or school race) puts no holder on its ballot. At a Vermont place (5005725, seed tl-c, opened Oct 20, 2026), all twelve county seats had no filer on Nov 3. At three drawn openings, every local race closed at the opening had no filer: Ogdensburg, New Jersey 7 of 7, Lebanon, Kentucky 14 of 14, Meeteetse, Wyoming 10 of 10. Seen: the November ballot and the results story list these county and town races with no names on them.

**Cause.** Found in code: `weighClosedContest` in src/core2/modules/candidacy.ts called `weighContest` with `incumbentFiled` true for every race below the state, which took the seat's holder out of the weighing on the premise that their filing was already on record. The voting engine's stand-in used to file it ("incumbent stands again"), and baba2ad07c (Oct 28) deleted that stand-in, so nothing filed for the holder and nothing weighed them.

**Fix.** Drop the flag: the holder of a race closed at the opening weighs standing again by the one rule (`standsAgain`), as at any race, and one who stands files with the opening record. Delete the readers that still assumed the stand-in's candidate id for a holder (`holds`, the incumbent fact in the reasons and the previous holder's identity at take-office in src/core2/modules/voting.ts). No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** Day one is in motion, at every level: a race the world opens in the middle of already has the field a real place would have, its holders weighing standing again by the same rule as anyone.

**Done when.** The pinned test at the Vermont place is red without the fix and green with it, and the PR counts local races with no filer at three other openings before and after; a second session, on the train or main in a drawn place it names with its seed that opens after a local filing deadline, sees the November ballot and the results story name the county or town races' candidates.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/closed-race-holders.test.ts (new)
