---
id: news-national-public-events-are-read
title: "A story of a national public event (the President's address, a nomination) is heard by its readers but never read, so no one can bring it up"
area: director
kind: bug
priority: 2
size: S
status: claimed
claimed-by: story builder (claude/project-thread-lcf812-national-reads)
pr:
after:
blocked-on:
lead: words
source: Account lead's ruling (Nov 15 22:27Z), from the list for director-public-events-reach-the-director
standard: 2
model: opus
effort: medium
root: none
---

**What.** The owner wants someone in the player's life to bring up a big public event after it happens, his example a friend who calls after the President's speech. Scenes start from a `news.read` record that names the reader, and a story of a national public event never makes one: its readers hear it (a known fact), but nothing records that they read it. Seen: in a played year, the President's address on a national outlet, and the people who follow that outlet.

**Cause.** Measured: at Wilmont, Minnesota (2770582, seed 2cb5aaf1), 70 days, the national outlets printed 10 `president.address` stories reaching 153 named followers, 5 `joint-address`, 10 `profile`, 5 `office.voted` and 5 `chamber-organized`, and none of them made a `news.read` record; the 20 `legislative-vote` and 5 `committee-hearing` stories did (29 and 33 named readers). Found in code: src/core2/modules/news.ts `onAfterDay` (line 808 on the Train at 29ef4685) emits `news.read` only for a story that argues a side on a policy topic, a law taking effect (`lawId`) or a bribe report (`crimeId` and `officialId`); any other story is only heard (`hear`, which keeps the known fact `news:<story>`).

**Fix.** The printed story carries the level the wire read from its record's own fields (`wireLevel`, set in src/core2/press-desk.ts `printItem`), and news.ts reads a story whose level is the nation's with no side, as it reads a law: one `news.read` per story per day, naming its readers. No list of kinds.

**Time box.** 2 hours.

**Rules.** Ask why: a person brings up only what a record says they learned, so the read names the reader and the story. Speed: the unattended year is timed with and without at three places, twice a side, alternated.

**Done when.** A second session plays a drawn place for a month past the President's address and finds a named reader of a national outlet's address story by the `news.read` id, and the year still runs under two minutes.

**Waits on.** Nothing.

**Files.** src/core2/modules/news.ts, src/core2/press-desk.ts, src/core2/national-reads.test.ts (new)
