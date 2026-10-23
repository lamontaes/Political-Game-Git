---
id: world-jobs-offer-deadline-reminder
title: "A job offer deadline holds the clock until the player answers"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr: #5232
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Replace a one-time offer-deadline reminder with a held stop once the play screen shows the player's offers with accept and decline controls. An unanswered offer should lapse only when the player lets it, rather than disappearing without a visible choice. The player sees the offer arrive, a reminder before its deadline, and the decision to accept or decline.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-offer-deadline-reminder is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-offer-deadline-reminder resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-offer-deadline-reminder.

Sent back 2026-10-20 from PR #5232 (branch claude/political-game-pool-3xfqef-2): deletes stopgap row SG-WORLD-jobs-offer-deadline-reminder; mark it resolved with its replacement instead; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5232 (branch claude/political-game-pool-3xfqef-2): jobs-player-offers.test.ts fails on the merged head: 'A job ends before its day's work, from calendar work.'; finish on that branch, merge main into it first.
