---
id: gov-bribe-offer-weighs-money-against-no-bills
title: "Someone living at a parent's home always offers a bribe for the money's sake, because the game reads their own bills as zero"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: effects
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder (#9262) staging bribe offers by the player, Nov 14, 2026; the Account lead asked for this item
---

**What.** Someone who offers a bribe weighs three things: what the favor is worth to them, their tie to the official, and bribes they have heard the official took. For a person living in a parent's home, like the player at the start, the favor's worth always comes out far ahead, however small the favor. A tie or an official's known history can never be the main reason. When such a person is accused, they can only ever say they wanted the favor. Seen: an accused player never says they offered because they knew the person, or because they had heard the official took money before.

**Cause.** Found in code: `src/core2/modules/corruption.ts` `offerValues` (about line 216) weighs the stake as `log1p(stake / (offerer.livingCostDailyMinor × daysPerMeanYear + 1))`. A person whose costs are carried by their household has `livingCostDailyMinor` of 0, so the year in the divisor is 0 and the term reads the stake against one cent. Measured: Willamina, Oregon (seed c0ffee08) and Bryant, Illinois (seed c0ffee13), label short-replies-friend. A favor of $10 gives a stake term of 6.9, against a tie of 0.85 and a known earlier bribe of 0.69. So `motiveOf` names "stake" in all 12 staged offers. The director already reads a person's year correctly: `yearOf` in `src/director/arc-variant.ts` (about line 419) uses the household's costs when they are larger.

**Fix.** This is a wrong reading of what money means to a person with no bills of their own, not a weight to tune. Weigh the stake against the year of living costs the person actually lives on: their household's, as `yearOf` does, or the person's own when they pay their own way. Use one shared reading, not a second copy. Then check that the offer rate still meets the calibration in `corruption/parameters.json` (bribeShareOfStake and the offer weights' citations) at the towns named there. Do not change a weight to make tie or reputation win.

**Time box.** 2 hours, Opus.

**Rules.** No dice; sliding scales: the stake keeps its log scale, only the year it is read against changes. One rule, all 56 places: the reading is the household's year everywhere. Speed: read on the decision day only.

**Done when.** In the played world (buildBenchWorld) at Willamina OR (seed c0ffee08) and a place drawn from all 56 (named with its seed), the player at home offers a small favor's bribe to someone close. The crime record's `reasons.offer` shows the tie weighing most, and the complaint's `motive` is `tie`, named by record id. The offer rate across the calibration towns stays within the parameter's checked spread. A second session sees an accused player say they offered because they knew the person.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/director/arc-variant.ts

**Notes.** Filed by hand on the #9262 branch, Nov 14. Lines waiting on it are in /mnt/project-files/words-lead/short-replies/conflict-accuse/deferred-motive-lines.md (an offerer's motive-tie and motive-reputation).
