---
id: tests-campaign-turn-ad-case-draws-places
title: "campaign-turn.test's ad case draws up to eight places until one suits, so it can pass or fail by the draw"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread "Give rivals more than one issue", Nov 14 (coordinator follow-up on PR #9155)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The case "an ad is a message the views engine reads for the people who saw it" in src/core2/campaign-turn.test.ts draws up to eight places (world(`ad-views:${attempt}`) from a run seed that defaults to the clock) and skips each one that has no platform, no money raised, no viewers or no stance, so which place it tests and whether it passes depends on the draw. It failed on one draw after PR #9155 changed what an ad is about and passed on three reruns. Guards: an ad reaching its viewers' stances in a played town.

**Cause.** Found in code: runSeed (src/core2/campaign-turn.test.ts line 67) defaults to createHash of Date.now(), and the case loops attempts over world(`ad-views:${attempt}`) until one passes its skips, which the lead ruled on Nov 14 a test the train carries must not do.

**Fix.** Pin one place and seed named in the test, chosen from a built world whose rival raises money and whose viewers hold a stance on the ad's recorded question, and fail with the place, seed and reason if it does not.

**Time box.** 2 hours for a Sonnet session.

**Rules.** One rule, all 56 places: the case names its place and seed, and place facts stay in data. Never loosen a test: the check that viewers' stances moved on the ad's own topic stays.

**Done when.** A second session runs the case at the pinned place and seed named in the test and sees it pass in under about two minutes, and sees the same failure message naming place, seed and reason when the case is pointed at a place where no one raised money.

**Waits on.** Nothing.

**Files.** src/core2/campaign-turn.test.ts

**Notes.** Filed Nov 14 from PR #9155.
