---
id: tests-view-learned-player-reads-no-letters
title: "view-learned.test.ts's letter test fails by seed: the drawn player never reads the town's letters"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words builder A on #9067, Nov 14, 2026, at the Words lead's order; the test is red on clean main at seed 9059152ee9d720c6"
model: sonnet
effort: low
root: none
checked: none
---

**What.** `src/director/view-learned.test.ts`, "a letter to the editor the player reads teaches where its writer stands...", fails when none of its ten drawn places has a letter the player reads. Seen: nowhere in play; the test proves a letter teaches a view and proves nothing in the places it draws.

**Cause.** Measured: on clean main (fa34439db8), place Baker, Minnesota drawn by `GOLDEN_PATH_SEED=9059152ee9d720c6 npx vitest run --dir . src/director/view-learned.test.ts`, the test fails with "0 proved". The log is /mnt/project-files/words-lead/8879/runs-873d02b006/view-learned.main.seed9059.log; the same failure shows on #8879's base c7ab15ab3f (view-learned.c7ab15ab.seed9059.log), so the branch did not cause it. In the places it draws, six have 0 letters in the year and four have letters and no reader: Baker MN (27 letters), New Preston CT (40), Burlingame KS (47), Yonkers NY (1), 0 read by the player. Measured in Baker MN: the drawn player's views engagement is 0.0166 and `readingDelay(api, playerId)` (src/core2/modules/news.ts line 497) returns null, because the delay is `ceil(newsOutletDelayDays / (engagement * trust / newsTrustAverage))` and that is above `newsMaxAgeDays` (30), so `scheduleDeliveries` never delivers a story to this person; 958 of the town's 968 other people have a delay. The test reads the story table only through `storiesHeard(api, player)`, so a player with no reading habit proves nothing. Not measured: the same figures in New Preston, Burlingame and Yonkers (I read only Baker), and why six places print no letter in a year.

**Fix.** The test is at fault, not the world: a person who follows the news so little hears no story is the engine working as written (engagement is a per-person draw). In src/director/view-learned.test.ts, `NEWS_DRAWS` loop (line 186): draw until the player has a reading delay and the place printed at least one letter, and list in the failure message each place passed over with its reason (no letters; player's `readingDelay` is null). Use the skill `drawn-place-tests`. Do not lower `expect(proved).toBeGreaterThan(0)`.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Never lower the assertion; draw places until the case exists, and name what was passed over (`drawn-place-tests`). No change to src/core2.

**Done when.** In a drawn place (Baker, Minnesota, seed 9059152ee9d720c6, named in its output) `GOLDEN_PATH_SEED=9059152ee9d720c6 npx vitest run --dir . src/director/view-learned.test.ts` passes and its output names the places it passed over; the same test passes on two other fresh seeds; a second session reads the passed-over list and sees Baker MN named with "no reading habit".

**Waits on.** nothing.

**Files.** src/director/view-learned.test.ts
