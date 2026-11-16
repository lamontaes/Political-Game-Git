---
id: gov-opening-terms-end-before-the-start-date
title: "At the opening three of every four serving terms have a scheduled end before the day the game starts, because the term in office is read as of the warm-up's first day"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: 9615
blocked-on:
lead: wire-office-budgets-justice
source: "Account lead thread, Nov 16, 2026, tracing a special election's term at Washington, DC for dev mode's Trace"
after:
standard: 2
model: opus
effort: medium
root: design-life-record
---

**What.** A new game opens on January 20, 2025 with 7,885 serving terms in the offices engine, and 5,854 of them carry an end date before that day (1,337 end on January 1, 2025, 546 on November 6, 2024, 673 on January 6, 800 on January 8, and so on). The people hold the office, but a term that "ended" before the game began is what dev mode's Trace and the person card show for them, and a seat that falls vacant in the window gets a special-election term that ends before it starts. The November 2024 elections happened before the game's first simulated day (the 31-day warm-up begins December 20), so no race is held for them and no term rolls over, and each holder serves on past the end of their listed term until the first simulated election in November 2026.
Seen: dev mode's Trace on any serving term at the start shows an end date earlier than the start date.

**Cause.** Measured: at Washington, DC (place 1150000), seed 122fae980ca0154537c6a8c7af1093cdb691b8d39f5d373b519bd763d8980285, by building with `buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "1150000", warmUpDays: OPENING_WARMUP_DAYS })` and counting the offices table's serving terms whose endDate is before the world's date: 5,854 of 7,885. For seat:US-NY:lower:135:0 the serving term is term:seat:US-NY:lower:135:0:2024-12-20, start 2023-01-01, end 2025-01-01, "in office at the opening". The opening seats each seat's term as of the warm-up's first day (modules/offices.ts, the seat history code that writes `startDate` and the past terms) and nothing seats the term that began after it.

**Fix.** In the opening's seating of a seat's current term (modules/offices.ts, the function that writes "in office at the opening"), seat the term in office on the game's start date: where the term of record has ended by then, the holder's next term (the same holder, re-elected, with the pre-start election's winning share from `electionBehind`) runs from the office's own start day, so every serving term's end date is after the start date. The player sees it in dev mode's Trace and on a person's card.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the seating stays in the one opening writer, with no second pass. No dice: the holder after the pre-start election comes from the seat's record, never a roll. One rule, all 56 places. Replace, never layer: the stale rows are replaced, not kept beside new ones.

**Done when.** A second session builds a world at a drawn place and seed it names and finds no serving term whose end date is before the start date (or names each exception and why), and at Washington, DC (seed above) the 5,854 are 0; year time within 20 percent at three places.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/bench/world.ts, src/bench/dev-trace.ts, src/core2/opening-terms-in-office.test.ts

**Notes.** Found while tracing gov-special-election-term-ends-before-it-starts, which this item contains: with every term in office current, a special election's vacated term has not run out. Whether the pre-start November 2024 winners should be the same people is a question of the seat's record the opening already holds (`elected` on the term); no number is typed. Counts above are one place; a scan at three drawn places is the first step.

The fix is the start date given to `openOffices` (`world.ts` passes the game's start day); serving terms ending on or before it: 0 at Washington, DC, place 2338740 and place 5522550 (was 5,854 of 7,885 at DC). A term that begins in the warm-up is held from the day the world opened. The DC death that opened a vacancy in the warm-up no longer happens in that world, because the holders are drawn as of the start day.
