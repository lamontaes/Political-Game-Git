---
id: press-paper-prints-its-own-endorsement
title: "A paper's own endorsement is not printed in the paper when another endorsement in the race scores higher that week"
area: elections
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/project-thread-hjvzia
pr: 9466
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: Voters' views thread, Nov 15 (the press endorsements build)
---

**What.** Papers now endorse in races on their beat (`outletWeighsRace` in src/core2/modules/campaigns.ts, called from `pressWeek` in src/core2/modules/press.ts). At Marshfield, Massachusetts (2538820), world seed 75d9b7ad, on Sep 29, 2025, newspapers 0, 1 and 3 endorsed in the township board races and reached their followers. By Oct 8 none of the five endorsements was printed. The papers printed cause groups' endorsements of the same races instead. Seen: a reader of a paper never reads that paper's own endorsement.

**Cause.** Found in code: `printWeek` in src/core2/press-desk.ts (the filter after the score sort, near line 963) keeps one endorsement story a race a week, the best-scored record of the week (`raceTold`). A paper's own endorsement is scored like any other group's, and it also competes with every other story for the reporters' slots (`storiesPerReporterWeek`).

**Fix.** In that filter, a race's endorsement story at an outlet is the outlet's own endorsement when it has one that week (the item's `organizationId` fact equals the outlet's), otherwise the best-scored one, as now. Print the outlet's own endorsement as its editorial, outside the reporters' story count, by the existing `endorsement` builder in src/bench/printed-words.ts. Add no new words; if the builder's lines do not fit a paper speaking for itself, list the lines needed for the Story session.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the printed story reaches the paper's followers as every printed story does. No new stopgaps. Never loosen `src/core2/outlet-endorsement.test.ts`.

**Done when.** A second session, on main, in a drawn place with a paper and a local race (place and seed named), plays to the week after its papers endorse and reads, in the News, each endorsing paper's own endorsement under its name. `src/core2/outlet-endorsement.test.ts` gains an assertion that each endorsement is in its own paper's stories, and that assertion fails before the fix.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/outlet-endorsement.test.ts

**Notes.**

- Nov 15 (views thread): built on claude/project-thread-hjvzia. The outlet's own endorsement prints in its own pages as a news item about it in runDesk (src/core2/press-desk.ts), under its head's name, outside the reporters' slots, and is the race's endorsement story at that outlet that week. Nothing on the page calls it an editorial (Words lead's ruling); the paper's own voice with its reason is item words-paper-endorsement-in-its-own-voice. At Marshfield, every paper endorsement prints by Oct 8, each under its head; the test failed before the fix with no printed story.
