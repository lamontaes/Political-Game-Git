---
id: office-stopgap-office-day-calendar-calendar
title: "Stopgaps in office-day-calendar (calendar): 1 open"
area: office
kind: stopgap
priority: 3
status: done
claimed-by: claude/office-local-39
pr: #4519
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-calendar.ts, kind calendar"
claimed-at: 2026-10-15T23:33:27.271Z
---

**What.** Replace or clear the 1 open calendar stopgap row(s) in src/core2/office-day-calendar.ts: SG-OFFICE-gov-meeting-dates. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-calendar.ts

**Notes.** First row: A council or board meets on its own rule for the bills placed before it, but the meetings where members file their own ordinances keep the world-legislating engine's tunable yearly count, so one body has two sets of meet

Oct 29 (CTO): the owner asked "why is vote locked at 6 p.m.? That shouldn't happen." Every town body meets at the one tunable evening minute in `src/core2/office-day-calendar.ts` (line 100), and members' ordinances are voted at the start of the meeting's day before the player's stop (stopgaps.json, about line 4239). Each body's real meeting day and hour come from the place's data, and nothing the player does is held until a fixed hour.
