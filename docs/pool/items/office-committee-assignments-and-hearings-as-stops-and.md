---
id: office-committee-assignments-and-hearings-as-stops-and
title: "Committee assignments and hearings as stops and scenes."
area: office
kind: feature
priority: 2
status: claimed
claimed-by: claude/political-game-pool-yucp92-ss
pr:
blocked-on:
milestone:
source: "docs/coordination/OFFICE-STATE.md line 19 (unchecked checklist line)"
claimed-at: 2026-10-20T04:59:54.277Z
---

**What.** Checked against main on Oct 16: PARTLY. Assignments (`assignCommittees` in `leadership.ts`) and hearings with witnesses and a committee vote (`legislature.ts`, `committeeRecords`) exist; the state day has committee entries, but `actOn` only spends time and no assignment or hearing reaches the player as a scene. The hearing bank (`data/english/parts/hearing.json`) is not read by the office day. Next: A "learn your seat" event when the player is assigned and an "attend the hearing" scene when their committee hears a bill. The player would notice the act on the politics screen as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the hearing reads the bill's sections and the members' stances, and the assignment reads the leader's decision; Ask why: each assignment and each hearing outcome keeps its reasons by record id; One rule, all 56 places: committee structure and hearing rules come from `src/core2/data/legislature/committees.json` and state data for all 56 places; No hand-written player text: chair questions and witness lines come from the English engine's banks (`data/english/parts/hearing.json`); This is a game, not a spreadsheet: attending is a stop the player opts into; skipping lets his character act; No dice: attendance and testimony follow interests and traits, never a roll.

**Done when.** In a drawn state (buildBenchWorld, seed named in the PR body) a state-day result lists the `committee:` assignment id and a hearing record id with witness ids and the chair's question, worded from the hearing bank, in a new `src/core2/office-day-state.test.ts`. The owner plays it: A "learn your seat" event when the player is assigned and an "attend the hearing" scene when their committee hears a bill.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-registry.ts, src/core2/legislature-committees.ts, src/core2/data/legislature/committees.json

**Notes.** Checklist line from OFFICE-STATE.md; verify against main before starting.

Oct 20: PR #5107 merged and the committee day cites the seating and hearing records, but the chair's question and witness lines and a learn-your-seat scene are not built.
