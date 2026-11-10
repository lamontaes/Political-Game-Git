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
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
---

**What.** Everything in the game steps day by day, so twenty years take 17 to 51 minutes where they finish at all. The owner asked on Nov 8 for a 20-year run in about five seconds, and said he is fine with it simulating everything as long as it makes sense in the end. The country tier already steps every state by the month in a few milliseconds. This item adds the second speed: when nobody is watching, the played town runs as results too (its monthly engines run; the daily loop, rival campaigns event by event, interviews and the press do not; elections are counted from the voters), and on return the day-by-day detail is rebuilt from the results. Dev mode's Run panel gets a 20 years control. The past before the start already runs this way (src/core2/pre-start.ts), so one coarse engine serves the past, other places and skipped years, and the campaign-stride switch (src/core2/fast-forward.ts) is deleted.

**Rules.** Speed (owner, Oct 29 and Nov 8): a country's year under two minutes, and long runs must not slow down. Two-level population: nobody gets a full past until they are filled in, but the CTO's note of Nov 10 on the design holds: the life record keeps writing remembered events for the player and the people around them during a skip. Replace, never layer. This item is size L, so the session that claims it splits it first.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, presses 20 years in dev mode's Run panel: the game reaches the date twenty years on and says how long it took; the Metrics tab's country, state and town rows show no state with more jobs than adults and no negative count in any month; the player's journal and the person cards of three people around them hold dated entries from the skipped years; and playing one more week day by day works. The nightly twenty-year test on main passes in a drawn place named with its seed.

**Files.** src/core2/life.ts, src/core2/pre-start.ts, src/core2/fast-forward.ts, src/core2/modules/macro.ts, src/core2/country-model.ts, src/bench/dev-mode.ts, src/bench/ui/dev-run.mjs

**Notes.** Related: release-nightly-twenty-year-game-on-main, core-speed-world-campaign-days-as-group-results. The check for counts that cannot be is countryProblems in src/core2/country-model.ts; the macro module throws on it when bookkeeping is on. After: core-country-tier-town-joins-its-state.
