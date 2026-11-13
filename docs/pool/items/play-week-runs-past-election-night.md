---
id: play-week-runs-past-election-night
title: "A player who loses never sees election night: Week runs past the returns, and a neighbor tells the result days later"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/p1-week-stops-for-election-night
pr: 9027
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at: 2026-11-13
---

**What.** Bryant, South Dakota (bench seed c23677ce-6e29-4a2c-b6f2-210084c22c56, main 5e68cde1): the player filed for the Bryant Common Council, campaigned, and on April 1, 2025 went canvassing and voted. The next thing on screen was April 3: "Luna Gonzales knows you were on the ballot in the council member race. They have the result, and they came to tell you." / "You won't like this. Jamie Rice won the council member race." No returns were ever shown. Henlopen Acres, Delaware (bench seed 4e72516e-1566-405f-b6f6-76c7fe9af3c1) did the same for the April 7, 2026 council race: the next stop was April 9, and a neighbor told the result on April 10. In Curtisville, Pennsylvania the returns showed only because a scene stopped the clock the morning after. Seen: election night's returns and the call, the night of the player's own race.

**Cause.** Found in code: src/bench/election-night.ts `electionNight` offers the returns only on the night of the count and the day after (`addDays(race.date, 1) < core.date` returns null), and the page asks for them (`/api/election-night`) only when an advance stops (src/bench/play.mjs `refresh`). src/bench/player.ts `advance` stops for the polls and for a candidate's morning, but not for the night of the count. So a Week pressed on election day runs on to its next stop, often two or more days later, and the returns are never offered.

**Fix.** In `advance`, at each midnight, stop once when the day just lived (or the one before it, if the count came in by that midnight) was election day for the character: they were at the polls or had a candidate's morning, and that night's returns (`electionNight`) are for that day. The page's refresh then shows the returns as it does now. src/bench/election-day.test.ts presses Week on election day and requires the clock to stop by the night after the count.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the stop reads the character's own polling visit and the count, with no place named. The returns are a view of the count record; nothing new is kept.

**Done when.** A second session, on main, plays a new life in a drawn place with a race the player can enter, files, and on election day presses Week after voting. The clock stops that night and the returns show the count and the call. The session takes a screenshot of the returns, whether the player won or lost, and src/bench/election-day.test.ts passes.

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/bench/election-night.ts, src/bench/election-day.test.ts
