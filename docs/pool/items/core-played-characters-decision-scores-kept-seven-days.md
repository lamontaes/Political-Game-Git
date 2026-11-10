---
id: core-played-characters-decision-scores-kept-seven-days
title: "The played character's own decisions lose their scores after seven days, though a code comment says a year"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: rc2-done-from-records
source: the builder of play-m0-04-why-scores-all-sampled, Nov 10, 2026 (pull request 8177); filed by Fable
---

**What.** Opening "why" on a decision shows the scores of every option the person weighed. For the character the player plays, those scores are gone a week later. The golden path's check had to open each decision on the day it was made to find twenty with scores. A player who looks back at last month's choices sees a why with no scores.

**Cause.** Needs cause. Looked at: the builder's report on pull request 8177, which says the scores are kept for `circleDecisionDetailDays` (seven days, a tunable) and then condensed, that this applies to the played character's own acts, and that a comment in src/core2/decision-detail.ts says a played character keeps them for a year. Not yet known: whether the played character is meant to be kept longer and a condition is missing, or the comment is out of date, and whether the early acts with no `controlledChoice` are the engine acting for the character.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to read the retention code and its comment against a played week, and rewrite this item with the cause. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Bookkeeping is a debug switch: reasons are saved for the player and the people they deal with, so the player's own must be there when they look. Speed: whatever is kept longer is bounded and folds, as the player's weighed choices already do after a year.

**Done when.** A second session plays 30 days in a drawn place it names with its seed, opens the why of one of the character's decisions from the first week, and sees its scores, or sees a worded line saying they were condensed, whichever the found cause says is intended. The comment in src/core2/decision-detail.ts and the code agree.

**Waits on.** Nothing.

**Files.** src/core2/decision-detail.ts, src/bench/m0-check.ts
