---
id: history-president-from-the-century
title: "Day one's President is the one the century since 1925 elected, not the real one"
area: elections
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/history-presidency
pr:
after:
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's answers to the calibration audit, Nov 17, 2026 (CTO line 6935086070 on #9747, "History is pure simulation from 1925"); History lane plan on #9747
checked:
---

**What.** Every world opens with a Republican President in a second term, read from one data file, so no world can have had a century of the other party. The owner ruled that history is simulated from 1925 and day one is what it produced.
Seen: every drawn world on main seats the President from data/research/offices/federal-executive-2026.json.

**Cause.** Found in code: src/core2/offices-state.ts line 449 sets the President's and Vice President's seat party from `federalExecutive`, and src/core2/modules/offices.ts `pastTerms` keeps "the federal executive's real record"; src/core2/past-elections.ts `buildPriorElections` sizes the race behind the term from the real 2024 result (`realResult`), and src/core2/officials-president.ts `worldMap` is the real 2024 map.

**Fix.**

1. A new `src/core2/electorate-century.ts` runs every presidential election from 1928 to 2024, a year at a step, on the one count (`countPlaces`) with the one race rule (`candidateReasons`); each state's 1925 lean is one starting shift from the world's seed and is carried from its own results after.
2. `candidateReasons` gains the researched time-for-change reason (Abramowitz 2008, Table 3), read in play's presidential races too.
3. `worldParties` in offices.ts seats the century's 2024 winner; `pastTerms` writes the century's earlier term; past-elections and the President's record read the century's race and map.
4. The world setting `history: "today"` keeps today's real record. Dev mode's "How this world opened" lists the century and the President.

**Time box.** 6 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the century's winners come from the count of each state's lean, the candidates and the party's time in office, never a roll. Replace, never layer: the real record is read only under the "today" setting.

**Done when.** A second session starts a new game at 1440x900 in a drawn place it writes down with its seed, opens dev mode's "How this world opened", and sees the President on day one named with the century's 2024 election and the century's list; starting a second drawn place shows the century there too, and src/core2/electorate-century.test.ts passes.

**Waits on.** Nothing.

**Files.** src/core2/electorate-century.ts (new), src/core2/data/history/century.json (new), src/core2/electorate-inputs.ts, src/core2/modules/offices.ts, src/core2/modules/elections.ts, src/core2/past-elections.ts, src/core2/officials-president.ts, src/core2/world-settings.ts, src/bench/world.ts, src/bench/dev-views/opening.ts, src/core2/electorate-century.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. Congress, the states, the economy and the laws follow on the same century (#9747, "History: plan").
