---
id: release-main-red-printed-news-reader
title: "The printed-news browser check fails when its drawn player hears no story still news on June 1 (Stewartville, Minnesota; Whitlash, Montana)"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-printed-news-reader
pr: 8946
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (merger codex-4629 on #8404; sonnet-7757's replay on #7365)
---

**What.** `src/bench/printed-news.browser.mjs` fails "News lists no story" on clean main at NEWS_SEED=n3 (Stewartville, Minnesota, place 2762806) and at a fresh seed (Whitlash, Montana, 3080275). The News screen there is empty and lists no outlet. A merge desk running the check sees a red that is not its pull request's. Guards: the check that News lists the printed stories a player heard, worded, keeps running in every drawn place.

**Cause.** Measured: Stewartville, Minnesota, NEWS_SEED=n3, with `node --import tsx` on a probe of the same world: the drawn player follows no outlet. In each age band only that kind's follow share follows, the most engaged first (`audienceOfKind` in src/core2/modules/press.ts); the player's habit is 0.001 against a town median of 0.126 (rank 90 of 134), so they hear no printed story. In Whitlash the player heard 10 printed stories, all from February, and News lists only what is still news on its date (`nightsNews` in src/bench/play.mjs; the archive keeps the rest). Both empty screens follow the game's own rules; the check assumed a reader with a fresh story.

**Fix.** Check only, no assertion changed: the check draws its place again, up to five, until the player has heard a printed story still news on the date (read from `/api/news`, the screen's own source), naming each place passed over and why. A resume gets the same 600-second timeout an advance already has, since it carries the jump on (Pawtucket, Rhode Island's resume took over the 120-second default).

**Time box.** 1 hours

**Rules.** One rule, all 56 places: the check keeps drawing from all 56 and names what it passes over; no place or seed is pinned. No assertion is loosened.

**Done when.** A second session runs the check against a fresh bench on main in the drawn place it names, at NEWS_SEED=n3 and at a fresh seed, and each prints PASS with the places passed over named.

**Waits on.** Nothing.

**Files.** src/bench/printed-news.browser.mjs
