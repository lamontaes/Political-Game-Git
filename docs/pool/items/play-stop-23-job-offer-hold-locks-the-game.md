---
id: play-stop-23-job-offer-hold-locks-the-game
title: "A job offer the screen never shows locks the game on December 14, 2026"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-stop-23-job-offer-hold-locks-the-game
pr: #6779
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-29T18:03:50.067Z
---

**What.** On the v0.22.10 release, on Monday December 14, 2026 (six weeks after I won my council seat), the screen says SOMETHING NEEDS YOU with no talk box and no message; Day and Week are grayed and Continue is the only control. Each Continue returns to the same date and screen, two Week presses wait almost two minutes and change nothing, and Quit to title then CONTINUE returns to the same lock. The pause behind it is a held job offer: the game's stop names reason "job-offered" for a Janitor job at $13.48 an hour (record job-offer:position:organization_e3138a3bdaea64a0:2026-12-01:4:person_fe9956e2c35fa4e5, hold true), but the play screen never shows the offer or a way to take or turn it down. A player can do nothing but close the game.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §9, Time. This is a game, not a spreadsheet: every hold the core raises for the player must show as a choice the player can answer, or play stops. Wire to the world: the job offer is a decision for the player, read by the jobs engine when answered.

**Done when.** The owner does the same steps on the next build and is not stopped: when the core holds the player for a job offer, the screen shows the employer, the job and the pay with Take and Turn down, either answer releases the hold, and Day and Week work again. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** When a job is offered, a screen shows the employer, the job and the pay with Take it and Turn it down; either answer, and Day and Week work again.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/jobs.ts, src/core2/modules/jobs.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:36 to 16:42; screenshots 83-dec-needs-7, 83-dec-needs-9, 84, 86, 87, 88, 89, 90. Pause id player:person_fe9956e2c35fa4e5:707. Stopper 3 of 3; this one ends play. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-24 from PR #5971 (branch play-first/play-stop-23-job-offer-hold-locks-the-game): New play.mjs:684-686 and916-917 contain dated owner notes forbidden by the merger morning check; retain technical comments but move ruling attributions to docs/PR. Functional/browser gate and explicitly required owner screenshot yes remain unclaimed; finish on that branch, merge main into it first.

Sent back 2026-10-25 from PR #5971 (branch play-first/play-stop-23-job-offer-hold-locks-the-game): fresh visual inspection at supported 1024x768 shows shared player-card/menu overlap despite passing pointer contracts; integrate the shared card repair and rerun pointer/keyboard visuals; owner screenshot yes and installed-build replay remain unverified; finish on that branch, merge main into it first.

Oct 25 audit: Also seen in Dandan, Northern Mariana Islands (seed 46b98144-23a8-42bd-b941-1954baea3bd8): Continue on the offer's stop resumes the same pause (from the dropped play-job-offer-stop-continue-stuck).

Implementation phase recorded 2026-10-26 for PR #5971: play-stop-23-job-offer-ui-implementation owns the reviewed code, bench checks and native before/after evidence. This original item retains its unchanged installed-build owner replay acceptance and stays open until that succeeds, per OWNER-DECISIONS.md:11; a green bench gate is not an installed-owner replay.
