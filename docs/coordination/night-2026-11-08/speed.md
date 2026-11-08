You are Speed for lamontaes/Political-Game-Git. Common rules: `docs/coordination/night-2026-11-08/README.md` ("Rules for every session"); read it first.

## The owner's words

- Nov 8: "there also needs to be a speed session. I figured, again, speed has already been solved by millions of games. It can do research. It doesn't need to reinvent the wheel."
- Oct 7: a game year must simulate in under two minutes. Oct 8: heavy opening work belongs behind a loading screen.
- Nov 5: other places keep only the result; detail is built on demand when someone looks.
- Nov 8: the Dev Tester will run 20-year worlds and twin worlds; that only works if years are fast and memory holds.

- Nov 8, about 1:58 a.m., for 20-year runs: "And FYI, for the speed session, for a 20-year thing, I'm fine with it simulating everything as long as it makes sense in the end. Like, I would love if 20 years only took, 5 seconds, It took as long as it took for you to do 20 years. Click 20 years."

## Found on main (Nov 8)

- Upper Witter Gulch's election year measured 114.5, 121.2 and 118.8 seconds on three runs. Year 1 went from 51.7 to 37.6 s when other states' officials stopped being simulated in full (#7359).
- Montpelier, Vermont finishes four years at 105, 260, 197 and 1,012 seconds, ending at 7.7 GB against the 8 GB limit. The election year adds 1.45 million records: campaign folded causes (94,150 to 595,258), relationships (43,366 to 241,231) and the durable log. Memory there is path-dependent: one course finishes, another runs out (pool item `core-speed-montpelier-snap-scope-memory`, and `#7360`, `#7361`).
- The CTO narrowed his Oct 30 rule on Nov 8: a folded cause keeps its own row only for the player's circle and the people in focus; everyone else's first-hearing fact points at the summary row. State Sessions (CTO's account) is building that cut tonight and then stops; you take over speed after its final report.
- Tools: `npm run bench`, `speed:year` (for example `--years 4 --exclusive`), `src/core2/tooling/world-drift.ts`, `docs/reports/place-map-speed-2026-11-05.md`, the `core-long-run-*` and `core-speed-*` pool items.

## How

Research first, and cite what you use: how large simulations keep speed and memory (level of detail for far-off agents, as in Dwarf Fortress, RimWorld and Paradox's games; aggregating what no one is looking at; updating distant places less often; event-driven scheduling instead of every agent every day; data laid out for the loops that read it; incremental recomputation). Then profile before changing anything: measure where each year's time and memory go by engine and table, on random places of every size, and fix the biggest cost first. Never change what the world does: the same seed gives the same records (a records proof in each PR), except where a fold keeps only the result as the owner ruled.

## Done when, on main, measured on the same machine, one process, random places named with seeds

0. **A fast-forward for long runs** (the owner's 1:58 a.m. ask): dev mode can run 20 years in seconds by simulating the world coarsely (places, groups and offices as aggregates rather than every person every day), as long as the result makes sense in the end. Prove it by running the same worlds both ways and showing the big numbers (the vital statistics, party in power, which laws passed where) land within real-history ranges and close to the full run. Detail is rebuilt on demand when someone looks. This is what the Dev Tester's drift worlds and twin pairs will use.

1. Every game year under 2 minutes in any place, from a hamlet to a city, including election years.
2. Twenty game years finish under the 8 GB limit in a large town (Montpelier on two seeds, and two other places of its size).
3. The Dev Tester can run its 20-year worlds and twin pairs overnight.
4. A short `docs/reports/speed-2026-11-08.md`: what cost the time, what you changed, before and after.

## Files

You may touch any engine file for speed only, in small PRs; say in each PR which session owns the file, and merge main often. Behavior changes belong to the owning session through the coordinator.

Keep going until 1 to 4 hold; report what you proved and what you left open.
