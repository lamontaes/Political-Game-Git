---
id: world-opening-clock-reads-arrival-hour
title: "The opening night's clock reads 12:00 AM while the light and the opening line say evening"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9770
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner, Nov 16, 2026 ("the timing is completely messed up"), crew line #9747 item 6c
---

**What.** A new game opens with the line "It's late on January 20" and a night picture, while the player's clock reads 12:00 AM. The three read different times. Seen: owner playing, Nov 16, and in a new life at Townsend, Delaware.

**Cause.** Found in code: the `/api/card` route in `src/bench/handler.ts` returned the player's packet clock, or minute 0 when none, so the card showed the midnight the day starts from, while `openingArrivalMinute` in `src/bench/opening.ts` put the opening scene at the hour the household gets home.

**Fix.** `shownMinute` in `src/bench/handler.ts` raises the clock to the arrival minute on the opening day; the card and the backdrop sites read it. The player sees the arrival hour on the card, such as 11:30 PM.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** The `wire-to-the-world` rule applies: the clock reads the household's work spans and the address airing through `openingArrivalMinute`. No dice: the hour is from records.

**Done when.** In a drawn place and a seed the builder did not choose, the card's clock on the opening evening shows the hour of the arrival minute, seen on the card by a second session on a new game (the browser check that showed it went with the opening's own landing line, Nov 17).

**Waits on.** Nothing.

**Files.** src/bench/handler.ts

**Notes.** #9256 carries a similar fix inside a 69-file change; this takes only the clock.
