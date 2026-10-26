---
id: play-circle-changes-on-screen
title: "The People web shows who is new in your circle this year and who drifted away"
area: play
kind: feature
priority: 2
size: S
status: claimed
claimed-by: play-first/play-circle-changes-on-screen
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from people-circle-turnover-too-low)
lead: play-first
milestone: play-first
claimed-at: 2026-10-26T04:01:17.213Z
---

**What.** A person's closest ties change over the years, and people-circle-turnover-too-low is fixing how often they do. The People web draws the circle as it is today with no sense of change, so a friend who drifted or a new coworker who became close is never noticed. Mark the people who joined the player's five closest in the last year and the ones who left it, with the reason on their card (moved away, new job, a falling-out), read from the tie records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: each new or lost mark reads a tie record and the event that changed it, by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after a played year, the People web marks at least the people whose tie records show them joining or leaving the player's five closest, each card naming the cause record, checked by a test against the tie records, shown by a screenshot with the place and seed named. The owner plays it: he sees it on the People web in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After a year, the People web marks who has become close to you and who has drifted away, and why.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/family.ts, src/bench/card.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: people-circle-turnover-too-low's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with people-circle-turnover-too-low (needs-from in the handoff line).
