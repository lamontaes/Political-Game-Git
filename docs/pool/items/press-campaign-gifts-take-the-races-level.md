---
id: press-campaign-gifts-take-the-races-level
title: "Campaign gifts and endorsements take the race's own level, and the paper tells one gift story and one endorsement story a race a week"
area: core
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: account-lead-gift-level
pr:
after:
blocked-on:
lead: words
source: "owner, Nov 14, 2026 (the paper should carry real local stories, not all politics); the Account lead's order on #8928; cause found by the gift-crowding cause-finder"
model: sonnet
effort: medium
root: none
checked: sonnet 2026-11-14
---

**What.** In one played year at Williamstown, Kentucky (seed survey-b) the town's donors made 1,333 campaign gifts and 556 endorsements, and the paper printed them as town news whatever race they were for, so in the weeks after filings opened they were 94 of 142 front-page stories. Six layoffs in those weeks never printed. Seen: the town paper's front page in the weeks after filings open carries a few race stories (one on a race's money, one on its backing) among the town's other news, and a layoff or an ownership change prints.

**Cause.** Measured: Williamstown, Kentucky, seed survey-b, one year from the start date (script in the PR body). `wireItem` in src/core2/press-topics.ts made every record kept at the town a town-level item, so a US Senate gift got proximity 1.0 in `runDesk` (src/core2/press-desk.ts); nothing limited gifts to one story a race, since the one-story-a-race rule keys on `billId` or `race`, which gifts do not carry; and national outlets could take them once their level was wider.

**Fix.** In `wireItem`, a `campaign-gift` or `campaign-endorsed` record takes the level of its contest's office (`raceLevel`). In `runDesk`, keep only the best gift and the best endorsement of each contest for an outlet's week, before a reporter's slots are counted, and keep both kinds off national outlets' desks.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice; the choice stays the score's. Replace, never layer: the town-level treatment of these records is removed, not kept beside it. Words are unchanged (printed-words names no level).

**Done when.** A second session, not the builder, plays a drawn place for a year (named, with its seed) and reads the paper in the weeks after filings open: gift and endorsement stories are at most one a race a week, federal and state races rank below the town's own records, and a layoff in those weeks prints or the item says exactly why not.

**Waits on.** Nothing.

**Files.** src/core2/press-topics.ts, src/core2/press-desk.ts, src/core2/press-gift-level.test.ts (new)
