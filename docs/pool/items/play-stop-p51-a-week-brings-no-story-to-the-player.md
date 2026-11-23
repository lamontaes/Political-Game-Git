---
id: play-stop-p51-a-week-brings-no-story-to-the-player
title: "A week passes with no new story: the player follows no paper or station, so the week's issue never reaches them"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: play-first
model: sonnet
effort: medium
root: none
milestone: play-first
source: "Owner's sitting 2026-11-23-1, row P51; traced by the Dead stops tracer (lane 5), Nov 23"
---

**What.** The owner, Nov 23 (P51): "I simulated a week. Nothing happened. No new news stories either." His Oct 27 ruling: "There is no 'a week passes with nothing happens'. You're playing a game." The town's papers print every week, but the player hears that week's stories only days later, second-hand, and a week with no scene shows them nothing new.
Seen: the News screen after Week, with that week's stories from the player's own paper.

**Cause.** Measured: at Verdigre, Nebraska (jurisdiction_acd66a0193bcadb4), seed 3c87be06-3434-405b-afab-c219d0d1b68d, by a headless new life on main 7f04c334 (an announced council candidate, playing Week three times from Jan 28, 2025). The weeks to Feb 4 and Feb 11 stopped on a letter and the mayor's address. The week of Feb 11 to Feb 18 ended with a `complete` packet and no stop. On Feb 18, `GET /api/news` held no printed story dated after Feb 7, though the paper prints each Friday (stories dated Jan 17, 24 and 31 and Feb 7). The Feb 7 stories first reached the player in that last week, and `GET /api/news/follows` answered `{"any":false}`. Found in code: `heardItems` (src/bench/calendar.ts:351) builds News's own stories from `storiesHeard` (src/core2/modules/news.ts:246), the stories the person heard. A printed story is heard on its day only by the outlet's followers and its one subject (`printItem`, src/core2/press-desk.ts:440-448). The followers are `followersOf` (src/core2/modules/press.ts:1378), drawn from `audienceOfKind` (press.ts:1338-1370), which takes each age band's top share of the town's full adults by `habitOf`. Nothing puts the player or their household in an outlet's audience, so the player hears the week's issue only when someone tells them, days later. This is the cause of P46 ("you don't give me one to follow") seen from the News side. The second half, an announced candidate's week with no outlet ask, is P50's cause (press.ts:4444, `ballot()` holds no announced filing; press-city-council-candidates-never-invited).

**Fix.** Nothing new is built here. P46's fix (lane 5's fixer: the News screen's Follow control, and a household that knows its paper and station from day one, built from the press engine's own follows) puts the player among the followers of their household's outlets, so `printItem` hears them the day the issue runs. P50's fix lets outlets weigh an announced candidate. When both are on main, a session plays three Weeks in a drawn place and checks that each week adds at least one story printed that week to News. If a week still passes with no story and no stop, file the director's spacing (`directorCircumstanceEveryDays`, read at src/director/ledger.ts:1635) as its own item with the measurement.

**Time box.** 2 hours for one Sonnet session, after both fixes merge.

**Rules.** Wire to the world: a story reaches the player through the press engine's follows and printing, the same rule every follower lives by. One model, two tiers: the player's household follows by the same rule as a counted household, times its count. Ask why: the check names each new story's record id and the outlet the player follows that carried it.

**Done when.** A second session starts a new life in a drawn place on main after P46's and P50's fixes, plays Week three times, and after each sees on the News screen at least one story printed by the player's own paper or station in that week, with the place, the seed, each story's record id and a screenshot at 1440x900.

**Waits on.** P46's fix (lane 5's fixer, sitting 2026-11-23-1) and press-city-council-candidates-never-invited.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/bench/calendar.ts

**You will see.** After Week, News has that week's stories from the paper and station your household follows.

**Screenshot.** The News screen after Week, from a drawn place, with the place and seed under it.

**Notes.** The sitting pointed P51 at the "empty after a year" items (town halls, office-day agendas, legislature studies, place prices). They are day-zero stock items, and none of their tables is what a played week lacks here. The week's stops came from other records (a letter, the mayor's address), so those items keep their own causes.
