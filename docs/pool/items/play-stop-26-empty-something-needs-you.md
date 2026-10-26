---
id: play-stop-26-empty-something-needs-you
title: "SOMETHING NEEDS YOU appears with an empty box and nothing to answer"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6126
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release the game stopped me with SOMETHING NEEDS YOU on July 1, September 10, November 10, 17, 19 and 25, and December 8, 2026. Each time Day and Week were grayed and the talk box was empty (no name, no line, only Mark gap, Say nothing and Leave) or missing. Continue moved on most times; on December 14 it did not (see play-stop-23-job-offer-hold-locks-the-game). I could not tell who or what needed me.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §4, Scenes and conversations. This is a game, not a spreadsheet: a stop that holds the player must say what it is. No hand-written player text: the stop's line comes from the English engine from the module's reason.

**Done when.** The owner does the same steps on the next build and is not stopped: every SOMETHING NEEDS YOU in the first two years of a drawn life names what needs the player and offers a way to answer it. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Every time the game stops you, the screen says who or what needs you and gives you a way to answer it.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:25, 16:27, 16:34; screenshots 65, 83-dec-needs-2 to 6. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.
Claim released Oct 25: branch never pushed (`play-first/play-stop-26-empty-something-needs-you`).

Sent back 2026-10-26 from PR #6126 (branch play-first/play-stop-26-empty-something-needs-you, head6b5edcfbbce8e40b3b27adeef09c02c96a7eb09e): stops-answerable.test.ts can pass with no observed story/stopped entries and never asserts the year completed; require explicit completion, nonempty actual staged/family-stop preservation and an observed unstaged journal-only moment, with a no-stops negative that fails and no output-conditioned redraw. Main merged cleanly; no runtime failure claimed. Words approval stands, installed-build owner acceptance remains open; finish on that branch, merge main into it first.
