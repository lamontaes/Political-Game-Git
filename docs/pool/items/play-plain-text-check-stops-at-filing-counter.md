---
id: play-plain-text-check-stops-at-filing-counter
title: "The plain-text browser check stops at the filing counter: no Leave button after the first talk"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-plain-text-check-stops-at-filing-counter
pr: #8545
after: 
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at: 2026-11-11T03:25:32.989Z
---

**What.** A second session replayed the plain-text check for play-stop-02 on main at 4fbc6a18a8 and it stopped in two drawn places. After the filing counter step in src/bench/plain-text.browser.mjs (the line that clicks #talk-leave), the talk box on screen was an unrelated talk with no Leave button. The check never reached the clerk's reply or Campaigns, so the item's finish line cannot be shown.

**Cause.** Measured: plain-text.browser.mjs line 173 timed out waiting for #talk-leave in Graniteville, Vermont (seed f416f8cf-40c0-4aff-a4da-5f4b834fc1a4) and Carolinas Heights, Northern Mariana Islands (seed c8fd1703-0ec9-44ca-baa7-6b6f031ce553). In the second, the box held Ella Holland asking 'Do you know much about Brian Monroe?' with replies and only Mark gap, no Leave. The failing step is the click after counter('seventeen'), so either the clerk talk was replaced by that scene or a Continue-only talk has no Leave; which one is not yet known.

**Fix.** Reproduce in the Carolinas Heights seed, find whether the clerk's talk was displaced by the scene or the scene's talk lacks Leave, and make the check and the game agree: a talk offers a way out unless a ruling says otherwise, and the check dismisses a scene that leads in before it reads the clerk. Test: plain-text.browser.mjs passes in two drawn places, place and seed named.

**Time box.** 3 hours

**Rules.** Look before you ask: search OWNER-DECISIONS.md for any ruling on leaving a talk before changing the Leave rule; none was cited when this item was filed. No hand-written player text; the check never hides the opening or a scene to pass.

**Done when.** In two drawn places src/bench/plain-text.browser.mjs passes through the filing counter, the clerk's reply and Campaigns. A second session sees in the running game on main, in a place and seed nobody chose, the talk after the filing counter offering a way out, and records it with pool seen.

**Waits on.** Nothing

**Files.** src/bench/plain-text.browser.mjs, src/bench/play.mjs
