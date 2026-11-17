---
id: core-speed-known-through-sorts-the-body-per-member
title: "Working out who knows whom in a chamber sorts the whole chamber once for every member"
area: core
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/speed-known-through
pr: 9836
after: speed-leadership-organizing-rates-each-pair-once
blocked-on:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
source: Speed, profiling the loading bar's slow warm-up days at Epping, New Hampshire, Nov 17
---

**What.** When a chamber's seats change, the game works out again which colleagues each member knows through it. For each member it sorted the whole chamber by id and then sorted the others with a comparison that read both members' start dates as text. In New Hampshire's 400-seat House that held one day of a new game's warm-up for most of a second. Seen: the loading bar stands still on the day a state session opens.

**Cause.** Measured: at Epping, New Hampshire (key 3324580, seed 81a2cdbf-b3a8-47b3-ae55-21a233d68a37), by a temporary timer in `knownThrough` (src/core2/sitting-closeness.ts) on main 74e6551b, the build and 60 played days spent 731 ms there over 34 computations (up to 386 seats). The warm-up's day 48 profile put 0.72 s of a 2.0 s day under `nearestInService`, called from `knownThrough` once per seated member. Found in code: `nearestInService` sorts `[...others, seat]` by id with `localeCompare` on every call and parses both dates in every comparison.

**Fix.** `knownThrough` ranks the body by id once when each member sits once; `nearestInService` takes that rank, works out each seat's keys once before sorting, parses each date once, and compares ids with one collator, which orders them as `localeCompare` does. The same members come out in the same order. The player sees the loading bar move on the day a state session opens, and every election's seating cost less.

**Time box.** 2 hours.

**Rules.** Speed: a body's order is worked out once, not once per member. No dice: the records proof shows the same records before and after, by table digest.

**Done when.** At Epping, New Hampshire, and at a drawn place, `speed:year --proof-out` gives 0 differing tables between main and the branch, and `knownThrough`'s own time at Epping is shown before and after. A second session builds a new game at a drawn place in New Hampshire on main and sees no warm-up day hold the bar for more than about a second on the day the state session opens.

**Waits on.** Nothing.

**Files.** src/core2/sitting-closeness.ts

**Notes.** Filed by Speed, Nov 17. Found while measuring item 3 on #9747 (the loading bar at Epping), on Blockers' branch merged with #9824.
