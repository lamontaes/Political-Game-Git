---
id: gov-sole-filer-dies-after-filing-deadline
title: "A seat whose only filer dies after the filing deadline goes to an election with nobody on the ballot"
area: gov
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** When the only candidate who filed for a seat dies after the place's filing deadline, ballot() in src/core2/modules/elections.ts drops the dead filer and nobody else can file, so the election runs with an empty ballot and the seat resolves by the holdover rule (voting.emptyRaces). Real places replace a candidate who dies late through their own law: a party or committee names a substitute, the dead candidate's name stays and a win opens a vacancy, or write-ins are counted. Seen in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) before the open-seat fix on gov-empty-ballot-stay-out-and-late-vacancy: the county treasurer filed on 2025-03-30 and died on 2025-10-17.

**Cause.** Found in code: src/core2/modules/elections.ts function ballot (line 1339) drops a dead filer and src/core2/modules/voting.ts writes the emptyRaces table row for the empty race (line 3335); seen in St. Johnsbury, Vermont (key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4).

**Fix.** Read the place's substitution law (the party names a substitute, the dead name stays and a win opens a vacancy, or write-ins count) from data, with a labeled estimate where none exists, and let ballot and the result read the substitute's filing.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the substitution law comes from each place's records, with a labeled estimate where a place has none. No dice: who is named comes from the party or committee's records, never a roll. An effect is a read: the substitute's filing is read by ballot() and the result.

**Done when.** A second session, in buildBenchWorld in a place drawn from all 56 (bounded draws that fail when they run out), finds a contest whose only filer died after the filing deadline carrying either a substitute's filing made under the place's recorded law or a recorded reason from that law that the dead filer stays on the ballot, named by record id, and M0-13's 'every race has someone on the ballot' reads it. On Politics, Campaigns the election night results show the contest with its candidate.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/modules/candidacy.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** A second sighting, traced Nov 10 for gov-decision-to-run-off-ballot-huntington: in Mashantucket, Connecticut (place key 0945995, world seed 7a0e449feba29bda0d3d54d316d649976ee7b892f35bcb55ce8adf0a619a44c7) a county filing officer filed for board seat 1 on 2025-06-07 and died by 2025-07-01, before the deadline of 2025-08-06. The filing row still read on-ballot, nobody filed in their place, and the race had nobody on it. That world plays its year in 22 seconds.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have added each place's rule for a sole filer who dies late; the seat already resolves by the holdover rule and the case is vanishingly rare.
