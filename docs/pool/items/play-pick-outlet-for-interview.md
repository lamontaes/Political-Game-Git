---
id: play-pick-outlet-for-interview
title: "The player picks which outlet to ask for an interview"
area: play
kind: feature
priority: 3
status: done
claimed-by: claude/pick-outlet
pr: #4777
blocked-on:
milestone:
source: 'docs/coordination/OPUS-PEOPLE.md "Needs from other sessions"; triage in people-needs-opus-people-22'
claimed-at: 2026-10-16T16:31:20.504Z
---

**What.** A holder of a seat or a candidate can ask for an interview, but the office-day interview act always picks the outlet with the widest reach that has not had them on yet, and the campaign act takes whichever outlet it is handed. Add a control on the news and office screens that lists the town's outlets from the press engine, shows each outlet's recorded reads on the player, and asks the one the player picks through `requestInterview`. A refusal shows its recorded reasons in the journal. The player would notice choosing the town paper over the big station.

**Rules.** An effect is a read, not a record: the chosen outlet's decision reads the same newsworthiness and regard as today; No hand-written player text: control names and record data only; Replace, never layer: the office act's built-in outlet pick becomes the default when the player leaves the choice to the character; Ask why: a refusal keeps its reads.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench player picks the second-widest outlet through the control, the interview row names that outlet id and either the story it produced or the refusal reads, and a test beside `src/core2/office-day-acts.test.ts` checks it. The owner plays it: asks the town paper for an interview and reads the story.

**Files.** src/core2/office-day-acts.ts, src/core2/campaign-day.ts, src/bench/player.ts

**Notes.** Found while triaging people-needs-opus-people-22.
