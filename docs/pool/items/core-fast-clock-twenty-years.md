---
id: core-fast-clock-twenty-years
title: "The fast clock: unwatched time runs in months for the whole world, a 20 years button in dev mode, and the present is rebuilt on return"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
---

**What.** Everything in the game steps day by day, so twenty years take 17 to 51 minutes where they finish at all. The owner asked on Nov 8 for a 20-year run in about five seconds, and said he is fine with it simulating everything as long as it makes sense in the end. The country tier already steps every state by the month in a few milliseconds. This item adds the second speed: when nobody is watching, the played town runs as results too (its monthly engines run; the daily loop, rival campaigns event by event, interviews and the press do not; elections are counted from the voters), and on return the day-by-day detail is rebuilt from the results. Dev mode's Run panel gets a 20 years control. The past before the start already runs this way (src/core2/pre-start.ts), so one coarse engine serves the past, other places and skipped years, and the campaign-stride switch (src/core2/fast-forward.ts) is deleted.

**Rules.** Speed (owner, Oct 29 and Nov 8): a country's year under two minutes, and long runs must not slow down. Two-level population: nobody gets a full past until they are filled in, but the CTO's note of Nov 10 on the design holds: the life record keeps writing remembered events for the player and the people around them during a skip. Replace, never layer. This item is size L, so the session that claims it splits it first.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, presses 20 years in dev mode's Run panel: the game reaches the date twenty years on and says how long it took; the Metrics tab's country, state and town rows show no state with more jobs than adults and no negative count in any month; the player's journal and the person cards of three people around them hold dated entries from the skipped years; and playing one more week day by day works. The nightly twenty-year test on main passes in a drawn place named with its seed.

**Files.** src/core2/life.ts, src/core2/pre-start.ts, src/core2/fast-forward.ts, src/core2/modules/macro.ts, src/core2/country-model.ts, src/bench/dev-mode.ts, src/bench/ui/dev-run.mjs

**Notes.** Related: release-nightly-twenty-year-game-on-main, core-speed-world-campaign-days-as-group-results. The check for counts that cannot be is countryProblems in src/core2/country-model.ts; the macro module throws on it when bookkeeping is on. After: core-country-tier-town-joins-its-state.

**Notes (Fable, Nov 10, measured).** What skipping days costs and loses, in Chumuckla, Florida (953 people, draw seed k3 with the label skip-probe, world seed aa4665b284a797eb671c6eafef8865086489b881e3eb81e1116a200598fb6482), one year each way on the tier branch:

- Day by day: 41.5 seconds. 59 deaths, the town's unemployment 4.0%, prices up 1.2%.
- Only each engine's dated work from the module calendar, no daily loops and nobody acting: 14.6 seconds. No deaths at all, unemployment 7.2%, prices flat, and day-by-day play then fails on its first day ("Business reviews must advance chronologically", the finance day).
- The calendar plus one whole day a month: 27.8 seconds. One death, unemployment 4.3%, prices up 4.5%. Play resumes.
- The largest costs in the calendar-only year: the press week 1.8 s, other governments' floor weeks 1.6 s, the housing review 1.4 s, the jobs review 1.3 s, counted renewal 0.9 s, local meetings 0.9 s. The daily loops that cost most per month: the health producer 1.1 s, jobs 0.8 s, the news pass 0.7 s.

So twenty years in seconds cannot come from skipping days in the engines as they are: their own monthly work is about 15 seconds a year in the smallest town, and deaths and prices live in the daily loops. The town has to be kept as counts during a skip (item core-country-tier-town-joins-its-state first), with only the player's household and circle kept as people, and rebuilt on return. Not yet measured: the same year with everyone outside one household's circle sent back to the counts first.

What exists today instead: the country's outlook (`countryOutlook` in src/core2/modules/macro.ts, branch claude/fable-twenty-years), which runs every state and the nation twenty years ahead on a copy in about four seconds and equals the months the game then plays. It does not move the game's date.
