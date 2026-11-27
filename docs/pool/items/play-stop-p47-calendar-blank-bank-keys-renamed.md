---
id: play-stop-p47-calendar-blank-bank-keys-renamed
title: "The calendar is blank: every entry asks the calendar bank for a key the Nov 19 rewrite renamed"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: play-first
model: sonnet
effort: low
root: none
milestone: play-first
source: "Owner's sitting 2026-11-23-1, row P47; traced by the Dead stops tracer (lane 5), Nov 23"
---

**What.** The owner, Nov 23 (P47): "now the calendar is completely blank. There's nothing coming up." The calendar's month, its day plate and Coming up show nothing at all, not even the player's own race, a filing date or a family birthday. It is the screen's data, not the Nov 17 redraw: the server sends no items.
Seen: the Calendar screen's month and Coming up list, empty on a new life.

**Cause.** Measured: at Verdigre, Nebraska (jurisdiction_acd66a0193bcadb4), seed 3c87be06-3434-405b-afab-c219d0d1b68d, by a headless new life on main 7f04c334 (Advanced, new world), then `GET /api/calendar?id=<player>`: `items` is `[]` on Jan 22, 2025, after the player announced for the town council race of Nov 3, 2026, whose filing, deadline and election all fall inside the 400-day window. `calendarItems` (src/bench/calendar.ts:73) builds each entry from `screenLine` and drops it when the line is null. It asks for `calendar.<kind>.<own|seats|1>` (src/bench/calendar.ts:128), `calendar.your-birthday.1` (:144), `calendar.birthday.1` (:187), `calendar.meeting.1` (:235) and `calendar.holiday.name` (:276). None of those keys exists in `data/english/parts/calendar.json` any more. The Nov 18 bank cut (0ec71617) emptied the bank, and the Nov 19 rewrite (b1da5290, "calendar written again after the cut") brought the lines back under new keys (`calendar.election.own.voters-decide-your-race-for-office`, `calendar.your-birthday.it-s-your-birthday`, `calendar.holiday.holiday` ...), each with its `move` (`election`, `your-birthday`, `holiday` ...). `screenLine` (src/english/screen-words.ts:43-44) finds no part for the old key and returns null, so every entry is dropped. Only `calendar.meeting-plan.1` kept its key. The same scan of literal `screenLine` keys also finds `bill-paper.authority.disputed` and `bill-paper.authority.disputed-body` missing (not this row). Carryover N16-48 (Nov 16, seen on the recording: Coming up starts with December) is the screen's sort, found in code: Coming up's list `ahead` in src/bench/ui/calendar.mjs:85-89 sorts `own` entries first and only then by date, and the player's own birthday is pushed with `own: true` (src/bench/calendar.ts:151-158). So a birthday in December stands above every January date, and so does the player's own race once filed.

**Fix.** Read the calendar bank by its `move`, as `standingLine` (src/bench/race-words.ts:44) reads campaign-standing, never by an exact key. Add one lookup to src/english/screen-words.ts that takes a bank, a move and a variant and returns the first playable part of that move whose key carries the variant (`.own.` for the player's own race; a part with a `{count}` slot for several seats; the plain part otherwise) and whose slots the facts fill. Switch the five calls in `calendarItems` (src/bench/calendar.ts:128, 144, 187, 235, 276) to it. A kind with no own part (filing-opens) falls back to its plain part. No bank line is added, changed or removed (Story owns `data/english/parts/`). Add a test that builds a played world in a drawn place (`buildBenchWorld`), announces or files for a local race, and fails when `calendarItems` returns no entry for that race or no family birthday. It must fail on main 7f04c334. For N16-48, Coming up sorts by date and keeps `own` only as the tie-break on the same day, as `calendarItems` already returns them (calendar.ts, its final sort); the own entries keep their mark. `calendarScreen` is a screen function, so post the change to its owning lane first (sitting 2026-11-23-1, rule 9).

**Time box.** 2 hours for one Sonnet session.

**Rules.** No hand-written player text: the fix reads Story's existing calendar lines by move and types no words of its own. Look before you ask: the lines exist in the bank since b1da5290, so nothing goes to Story unless a kind has no part at all. One rule, all 56 places: the test draws its place and names the place and seed it used.

**Done when.** A second session starts a new life in a drawn place on main after the merge, announces for a local race, and opens the Calendar: Coming up lists the race's filing dates and election day and the family's birthdays, and the month marks those days. Coming up's first line is the nearest date, not the player's birthday months ahead (N16-48). It records the place, the seed and a screenshot at 1440x900, and the new test fails on 7f04c334 and passes on the fix.

**Waits on.** Nothing.

**Files.** src/bench/calendar.ts, src/english/screen-words.ts, src/bench/ui/calendar.mjs, src/bench/calendar-items.test.ts (new)

**You will see.** The Calendar lists your race's filing dates, election day and your family's birthdays under Coming up.

**Screenshot.** The Calendar after announcing for a local race, from a drawn place, with the place and seed under it.

**Notes.** Before picture (Verdigre, Nebraska, seed above, Jan 20, 2025): the month and Coming up empty, the day plate "Nothing is on this day." Picture on branch claude/pt-shots-deadstops: `p47-calendar.png`. The sitting's guess ("most likely the month view shows only January") is ruled out: the month view is given no items to show.
