---
id: office-caucus-and-leadership
title: "Caucus and leadership:"
area: office
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 20 (unchecked checklist line)"
---

**What.** A state legislature's leaders (speaker, president, majority and minority leaders, whips) exist in the leadership engine (`src/core2/modules/leadership.ts`) but the player does not deal with them as people. Make the leaders people the player sees in the office day: they set the floor agenda, assign committee seats, and ask for votes, and the player can ask them for a bill to be heard or a seat. The player would notice that a bill moves when the speaker agrees, and that crossing leadership has a cost he can read.

**Rules.** No dice: a leader's answer follows their traits, party, relationship with the player and the law, never a roll; An effect is a read, not a record: the agenda and committee assignment read the leader's decision at the moment they set the calendar; Ask why: a refusal or grant keeps the leader's reasons by record id; The chain is the acceptance: follow one request from the player to the leader's reply, the agenda change and the bill's vote; One rule, all 56 places: which leaders exist is chamber data for all 56 places; No hand-written player text: the scene words come from the English engine; This is a game, not a spreadsheet: no form; a short talk with a named person.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): as a state legislator the bench player asks the majority leader for a hearing, the leader answers with reasons (ids named), and the agenda for that chamber's next session reflects the answer. Tests beside `src/core2/office-day-state.ts` tests. The owner plays it: asks the speaker to schedule his bill and reads why the answer was yes or no.

**Files.** src/core2/modules/leadership.ts, src/core2/office-day-state.ts, src/core2/office-day-acts.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
