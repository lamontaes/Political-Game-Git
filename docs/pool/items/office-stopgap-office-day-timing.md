---
id: office-stopgap-office-day-timing
title: "Stopgaps in office-day (timing): 1 open"
area: office
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/meeting-vote-hold
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/office-day.ts, kind timing"
claimed-at: 2026-10-20T00:33:55.893Z
---

**What.** Replace or clear the 1 open timing stopgap row(s) in src/core2/modules/office-day.ts: SG-OFFICE-member-filings-at-midnight. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/office-day.ts

**Notes.** First row: Ordinances other members file at a regular meeting are voted at the start of the meeting's day, before the player's stop at the meeting's hour, so the player's character votes them on its own even when the player is at t

Looked at Oct 20 (claude, claude/meeting-vote-hold), released unbuilt. The pieces for the fix are on main: office-day already posts a meeting row per body (`agenda`, `takenUp`, `playerPresent`, a stop at the meeting hour) and `closeMeeting` votes whatever the player did not take up; `takeUpItem` and `speakOnItem` act on items that sit on `agenda`. World-legislating's `local-meeting` work (`localMeeting` → `holdSession` → `fileChanges`) drafts members' ordinances and calls `holdVote` at once, so they never reach the agenda. The change is: when the meeting row for today has `playerPresent`, `holdSession` leaves each member-filed bill `drafted`, appends it to the row's `agenda` and `agendaItems` (an office-day export, since world-legislating cannot import the meeting row table directly: register a hook the way `beforeVoteHooks` do), and `closeMeeting` votes the rest. What I did not establish: on which side of the player's stop the calendar work dated the meeting day runs (both `local-meeting` and the office-day `meeting` close are dated the meeting day). That order decides whether the close runs before the stop and must be measured first, in a bench world where the player holds a council seat (the golden-path step that reaches a meeting stop in `src/bench/path-check.ts`). Tests belong beside `office-day-calendar.test.ts`.
