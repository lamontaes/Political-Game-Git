---
id: history-states-executives-from-the-century
title: "Day one's governors and statewide officers are the ones the century since 1925 elected"
area: elections
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/history-states
pr:
after:
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's answers to the calibration audit, Nov 17, 2026 (CTO line 6935086070 on #9747, "who holds every office"); History lane plan on #9747, PR 3a
checked:
---

**What.** Every world opens with each governor and partisan statewide officer in the party of the real record, so no world's states differ from today's. The owner ruled that day one is what a history from 1925 produced.
Seen: every drawn world on main seats governors from the calibration corpus and statewide officers from statewide-executive-parties-2026.json.

**Cause.** Found in code: src/core2/offices-state.ts `stateOffices` seats a governor from `governorParty` (the corpus's governors, line 127) and every other statewide officer from `statewidePartyOf` (statewide-executive-parties-2026.json, line 558); `worldSeatParty` then flips a seat only where the world's one swing carries the state's 2024 share across even.

**Fix.**

1. src/core2/electorate-century.ts elects every governor and partisan statewide officer in its own cycle from 1925 (odd years included), on the one count path, with each office's term limit from state-offices.json.
2. Each century candidate brings their own campaign means, drawn once per person and read by the race rule's spending reason, so two races of one year and place meet different candidates.
3. `worldParties` in offices.ts seats the century's officers with their careers and past races.
4. Dev mode's "How this world opened" shows the governors on day one.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: each office goes to the side the one count gives it from the state's lean, the candidates and the year's tide, never a roll. Replace, never layer: the real record is read only under the "today" setting.

**Done when.** A second session starts a new game at 1440x900 in a drawn place it writes down with its seed, opens dev mode's "How this world opened" and sees the governors on day one by party from the century; the town's governor and statewide officers hold the century's seats, and src/core2/electorate-century-states.test.ts passes.

**Waits on.** history-congress-from-the-century (#9834), which this branch is stacked on.

**Files.** src/core2/electorate-century.ts, src/core2/data/history/century.json, src/bench/dev-views/opening.ts, src/bench/dev-views/opening-sources.json, src/core2/electorate-century-states.test.ts (new), src/core2/electorate-century-congress.test.ts

**Notes.** Filed by the History lane, Nov 17, 2026. The state legislatures are PR 3b, after the CTO's line on counting other states' chambers as results.
