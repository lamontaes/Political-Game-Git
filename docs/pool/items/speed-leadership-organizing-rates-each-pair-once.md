---
id: speed-leadership-organizing-rates-each-pair-once
title: "A chamber organizing its leadership rates each voter and candidate pair once, not once per post"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead and the Skills thread, Nov 15: the paired performance guard measured the Train at 1.27 to 1.37 against 1.2 at Sinajana, Guam, and the year's profile at Vilas, SD (place 4667340) put leadership organizing at 6.5 percent"
claimed-at:
after:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
---

**What.** When a chamber's membership changes it elects its speaker, its party leaders and its committee chairs again, and each election has every member rate every candidate again, so the same pair is rated once for every post. This is where a played year spends 2 s of 28 at Vilas, South Dakota, nearly all of it in Congress, whose chambers reorganize when a seat changes hands. Seen: the paired runs at Vilas and Edmore, North Dakota, in /mnt/project-files/account-lead/speed/.

**Cause.** Measured: in the played year at Vilas (place 4667340, seed c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716), `organize` takes 2,039 ms inclusive, of which `voteOf` 1,872 and `rating` 1,196 (`closenessBetween` 1,184); the two federal chambers account for 1.65 s over 9 organizings (2,235 members in all), the player's state's chambers 0.06 s over 3 and the town and county bodies 0.001 s; no other state's chamber organized in the year. `voteOf` calls `rating(voter, candidate)` for every candidate for every post, and a pair's rating does not change inside one organizing (party side, both leans, their tie and years served on the same date). It also sorts the candidates to take the first.

**Fix.** In `leadership.ts`, keep each pair's rating for the length of one organizing (the way each member's lean already is) and take the best candidate with one pass in the same order (highest rating, then the smaller member key). Holders, votes and committee seats stay identical; only the repeated work goes.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Speed (`AGENTS.md`): no change may make a year more than 20 percent slower; never loosen the limit. No dice: the same ratings and the same tie-break, so the same holders.

**Done when.** At Vilas (seed c200623d) and Odessa, Washington (place 5350745, seed 6446dd14), the digest of the organized posts, votes and committee seats of six chambers equals the one taken before the change (pinned in `leadership-rating-reuse.test.ts`), the played year's record digest at Vilas and Edmore is identical, and a second session on main times year 1 at those places lower, twice each side alternated.

**Waits on.** Nothing.

**Files.** src/core2/modules/leadership.ts; src/core2/leadership-rating-reuse.test.ts (new)
