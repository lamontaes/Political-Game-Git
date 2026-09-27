---
id: world-aging-benchmark
impact: none
---

A development measurement of how a world with nobody played holds up over
decades. `npm run world:aging` opens a watched world the way "Watch the
world" does, in a named place, presses the observer clock's "A day" button
for a number of game years, and records each year's Day time, the size of
every history array, the save size and the time to save and reopen through
the real save store. A CPU profile of the first and last year names the
functions whose cost grew most. The first run is in
`docs/reports/world-aging-benchmark.md`.

Nothing in play changes: this is a script and a report.
