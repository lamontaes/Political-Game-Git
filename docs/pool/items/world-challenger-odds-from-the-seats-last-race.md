---
id: world-challenger-odds-from-the-seats-last-race
title: "A challenger's odds against a sitting holder come from the seat's own last race, not a fixed 0.15"
area: world
kind: wiring
priority: 2
size: S
status: in-pr
standard: 2
after:
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "CTO, Nov 17, 12:47Z on #9747 (the governing lead is inactive); History's plan, family 9c (comment 6947526428)"
lead: world
---

**What.** A person weighing a run against a sitting holder reads their chance as their standing times a fixed 0.15 (`candidacyChallengerOdds`), the same for a seat the holder won by a point and one they won unopposed. Seen: the decision's `chance` reason at any seat with a holder.

**Cause.** Found in code: `reasonsFrom` in `src/core2/modules/candidacy.ts` multiplied standing by the typed level `candidacyChallengerOdds` (0.15, ESTIMATED from published re-election rates), a pin: the world's value moved with the published figure.

**Fix.** The odds are one less the normal curve at the holder's last winning lead over a swing spread (`candidacySwingSpread`, ESTIMATED, the strength of a swing, never a level). The lead is read from the seat's own newest counted race (`seatLastMargin` in `voting.ts`, from the race rows' major-party votes or the town contest's count); an open seat keeps odds of one. `candidacyChanceWeight` and the bar are untouched (the pool item `elections-a-persons-read-of-their-chance-cannot-move-who-runs` says not to re-weigh). `src/core2/candidacy-challenger-odds.test.ts` draws places, plays the first general election and checks the odds fall as the lead rises.

**Time box.** 3 hours.

**Rules.** No dice; one engine (the seat's race is read, not kept again); the spread is a strength, ESTIMATED with its source.

**Done when.** A second session plays a drawn place past its first general election in dev mode and sees, on a decision against a holder, a `chance` reason that differs between a seat won narrowly and one won widely (place and seed named).

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/data/candidacy/parameters.json, src/core2/candidacy-challenger-odds.test.ts
