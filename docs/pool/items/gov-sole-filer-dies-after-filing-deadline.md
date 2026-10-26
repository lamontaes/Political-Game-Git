---
id: gov-sole-filer-dies-after-filing-deadline
title: "A seat whose only filer dies after the filing deadline goes to an election with nobody on the ballot"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When the only candidate who filed for a seat dies after the place's filing deadline, ballot() in src/core2/modules/elections.ts drops the dead filer and nobody else can file, so the election runs with an empty ballot and the seat resolves by the holdover rule (voting.emptyRaces). Real places replace a candidate who dies late through their own law: a party or committee names a substitute, the dead candidate's name stays and a win opens a vacancy, or write-ins are counted. Seen in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) before the open-seat fix on gov-empty-ballot-stay-out-and-late-vacancy: the county treasurer filed on 2025-03-30 and died on 2025-10-17.

**Rules.** One rule, all 56 places: the substitution law comes from each place's records, with a labeled estimate where a place has none. No dice: who is named comes from the party or committee's records, never a roll. An effect is a read: the substitute's filing is read by ballot() and the result.

**Done when.** In buildBenchWorld in a place drawn from all 56 (bounded draws that fail when they run out), a contest whose only filer died after the filing deadline carries either a substitute's filing made under the place's recorded law, or a recorded reason from that law that the dead filer stays on the ballot, named by record id, and M0-13's 'every race has someone on the ballot' reads it. **On screen.** Nothing yet: it would show on Politics → Campaigns and the election night results, and nothing there reads it.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/modules/candidacy.ts

**Notes.** TODO
