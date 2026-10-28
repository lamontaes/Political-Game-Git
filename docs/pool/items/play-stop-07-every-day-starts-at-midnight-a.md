---
id: play-stop-07-every-day-starts-at-midnight-a
title: "Day lands on the next morning and a 3-hour act spends 3 hours of the clock"
area: core
kind: bug
priority: 1
size: M
status: dropped
claimed-by:
pr: #6059
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release Day went from Monday 8:30 PM to Wednesday 12:00 AM, skipping Tuesday, and every later Day and Week landed at midnight. Knock on doors said 3 hours but the clock did not move. This part makes an advance land on the next morning and makes an act spend its hours on the player's clock.

**Rules.** Serves LAW.md §9, Time. Sliding scales and causes: the clock moves by what the player does, so an act that takes 3 hours spends 3 hours. This is a game, not a spreadsheet: the player has to see days happen, not midnights.

**Done when.** In a drawn place, Day pressed at 8:30 PM lands the next morning, Week lands on a morning seven days on, and a 3-hour act moves the clock 3 hours, checked by a test on the player's clock.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Pressing Day from any evening lands on the next morning, and after a 3-hour campaign act the clock reads 3 hours later.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/player-v1.ts, src/bench/handler.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-07-every-day-starts-at-midnight (Oct 24, lane; the work order's clock half). `advancePlayerV1` lands every advance at minute 0 of the next day. The clock is the M0-M2 lead's engine file (`needs-from: m0-m2` if the lane cannot change it inside the item's Files). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Travel plus filing left the clock at Mon 8:30 PM; three hours of door knocking did not move it; every Week landed at 12:00 AM (Wed Jan 22, then Tue Jan 28 after a Week from the 22nd). Owner: "Why does it say it's midnight?" / "it still shows 8:30 p.m."

Sent back 2026-10-25 ~21:55 UTC from PR #6059 (branch claude/quirky-ride-vrwwz4-play-stop-07, head 5fcd0cb01b with main merged in): both body screenshots are wrapped in backticks so they render as code, not images; unwrap the image tags and it goes back in the queue; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6059 (branch claude/quirky-ride-vrwwz4-play-stop-07): Native Cacao PR held-state image at 1440x900 shows the player card covering filing-story reply controls even though clock assertions pass; resolve play-story-replies-covered-by-player-card and rerun pointer/keyboard plus native visual acceptance, keeping installed-owner acceptance separate.; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6059 (branch claude/quirky-ride-vrwwz4-play-stop-07): The overlap is fixed, but Mark gap and Say nothing remain visibly enabled and inert in the real held filing story with both pointer and Enter (zero requests, unchanged state); play.mjs handlers return when talk is unset, while clock.browser.mjs only Tab-walks those controls, so the every-response activation acceptance is unmet; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `integration-day-lands-on-morning-and-places-keep-hours`; close into it and carry any line it lacks there.
