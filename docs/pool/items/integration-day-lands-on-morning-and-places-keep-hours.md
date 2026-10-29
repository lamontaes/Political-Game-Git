---
id: integration-day-lands-on-morning-and-places-keep-hours
title: "Day and Week land on the morning, an outing moves the clock, and nobody is cast where a place is closed or at midnight"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6397
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado, as Carlos Washington)"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** After a Day or Week the clock sits at 12:00 AM, so offices and cafes are open at midnight with daylight in the windows, and volunteers appear in the bedroom at midnight. PR #6059 (play-stop-07, sent back twice, conflicted, no push since Oct 26) has the clock fix. This item lands it from main as a superseding PR with its registered stopgap, and makes scene casting read the clock and the place's opening hours: a person is cast at a place only when it is open and they would be there.

**Rules.** One rule, all 56 places: opening hours by kind of place in a parameter table, never by name. No dice. An unregistered stand-in is a defect: the day-start minute is a registered stopgap until a person's own wake time is read.

**Done when.** src/bench/player-day-morning.test.ts passes in a drawn place (Day twice lands on consecutive mornings, Week seven days on, a three-hour canvass moves the clock three hours); a test shows nobody but the household cast at home between bedtime and morning and no business backdrop at an hour it is closed; the stopgap row names playerDayStartMinute and its marker sits on the read.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Press Day at night and you wake at 7 AM; nobody is in your bedroom at midnight.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/player.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/scene.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json

**Notes.** Supersedes #6059 (claude/quirky-ride-vrwwz4-play-stop-07, Fixer 3); its pool item play-stop-07-every-day-starts-at-midnight-a closes with this one. Owner, Oct 27, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched docs/ for the subject.
Sent back 2026-10-27 from PR #6397 (branch claude/integration-clock-and-hours): clock.browser.mjs fails in 3 of 3 drawn places: a story stop at the start minute leaves the card unmoved; finish on that branch, merge main into it first.
