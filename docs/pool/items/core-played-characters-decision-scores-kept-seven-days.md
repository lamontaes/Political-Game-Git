---
id: core-played-characters-decision-scores-kept-seven-days
title: "The played character's own decisions lose their scores after seven days, though a code comment says a year"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core-played-characters-decision-scores-kept-seven-days
pr: #8409
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: rc2-done-from-records
source: the builder of play-m0-04-why-scores-all-sampled, Nov 10, 2026 (pull request 8177); filed by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:56:16.337Z
branch: claude/pool-core-played-characters-decision-scores-kept-seven-days
---

**What.** Opening "why" on a decision shows the scores of every option the person weighed. For the character the player plays, those scores are gone a week later. The golden path's check had to open each decision on the day it was made to find twenty with scores. A player who looks back at last month's choices sees a why with no scores.

**Cause.** Found in code: two tests for "the player's own" disagree. When a record is written, `keptDecision` (src/core2/decision-detail.ts, line 102) keeps every score for a decision whose actor is `core.playerId` or is a character the player controls (`isExplicitlyControlledPersonV1`, passed in at src/core2/state.ts lines 753 to 757). The condensing pass knows only `core.playerId`: `involvesPlayer` (decision-detail.ts, line 228), `condenseCircleDecisions` (lines 296 to 318) and `condenseRelationshipDecisions` (line 192). The bench plays whoever the player chose (`this.personId`, src/bench/player.ts line 91), who is controlled but need not be `core.playerId`, the entrant generated at the opening (src/bench/world.ts line 414). So a chosen character's acts keep their scores for `circleDecisionDetailDays` (seven days) and are then condensed like a circle member's, though the file's opening comment and `playerDecisionDetailDays` say a year. Read on main Nov 10; not confirmed by a run, and which character the M0-04 check plays was not traced.

**Fix.** Put the test for "the player's own" in one function in src/core2/decision-detail.ts (the actor is `core.playerId` or is controlled, by `isExplicitlyControlledPersonV1`) and use it at write time and in every condensing pass (lines 112, 192, 228, 302 and 318), so a controlled character's routine acts and weighed choices go to the player's queue and keep their scores for `playerDecisionDetailDays`. Add a test that plays 30 days as a chosen resident who is not the generated entrant and reads the scores of a first-week decision. If the run shows the M0-04 character is `core.playerId` and still loses scores, set this item back to Needs cause with what was seen.

**Time box.** 3 hours for one Sonnet session, to read the retention code and its comment against a played week, and rewrite this item with the cause. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Bookkeeping is a debug switch: reasons are saved for the player and the people they deal with, so the player's own must be there when they look. Speed: whatever is kept longer is bounded and folds, as the player's weighed choices already do after a year.

**Done when.** A second session plays 30 days in a drawn place it names with its seed, opens the why of one of the character's decisions from the first week, and sees its scores, or sees a worded line saying they were condensed, whichever the found cause says is intended. The comment in src/core2/decision-detail.ts and the code agree.

**Waits on.** Nothing.

**Files.** src/core2/decision-detail.ts, src/bench/m0-check.ts

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:56 UTC) on branch claude/pool-core-played-characters-decision-scores-kept-seven-days.
