---
id: office-caucus-and-leadership
title: "Caucus and leadership:"
area: office
kind: feature
priority: 2
status: done
claimed-by: claude/office-caucus-leadership
pr: #4794
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OFFICE-STATE.md line 20 (unchecked checklist line)"
claimed-at: 2026-10-16T18:43:18.363Z
---

**What.** Checked against main on Oct 16: PARTLY. The state day has a caucus entry that records the leader's reasons (`caucusLeader` in `office-day-state.ts`) and `leadership.ts` seats leaders, but `legislature.ts` never reads a leader, so no leader sets an agenda, and the player cannot ask one for anything. Next: An act "ask the majority leader for a hearing": the player's request is a record carrying the leader's reasons, and `scheduleVote` or the committee referral reads it. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** No dice: a leader's answer follows their traits, party, relationship with the player and the law, never a roll; An effect is a read, not a record: the agenda and committee assignment read the leader's decision at the moment they set the calendar; Ask why: a refusal or grant keeps the leader's reasons by record id; The chain is the acceptance: follow one request from the player to the leader's reply, the agenda change and the bill's vote; One rule, all 56 places: which leaders exist is chamber data for all 56 places; No hand-written player text: the scene words come from the English engine; This is a game, not a spreadsheet: no form; a short talk with a named person.

**Done when.** In a drawn state legislature (buildBenchWorld, seed named in the PR body), a request record with the leader's reasons by id changes whether the bill is scheduled, and a test shows the next session's agenda differs between a yes and a no. The owner plays it: An act "ask the majority leader for a hearing": the player's request is a record carrying the leader's reasons, and `scheduleVote` or the committee re.

**Files.** src/core2/modules/leadership.ts, src/core2/office-day-state.ts, src/core2/office-day-acts.ts, src/core2/data/office-day/state-parameters.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.
