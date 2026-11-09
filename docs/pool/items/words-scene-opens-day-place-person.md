---
id: words-scene-opens-day-place-person
title: "Every scene opens by naming the day, the place and the person"
area: words
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: story/scene-opens-day-place-person
pr: "#8006"
lead: words
blocked-on:
milestone: play-first
source: "Owner, Nov 8: 'If it's June 7th, it says first thing on June 7th. You head to the clerk's office and speak to Maria Patton. And then it starts like that.'"
---

**What.** The filing counter already names the day (#7767). Every other scene's first narration line now does too, from the one scene composer (`composeScene`), with the bench's staged scene (`storyScene`) putting the same line before a purpose's own setup unless that setup already names the day. The line is worded by new `arrival` bank pieces in `data/english/parts/scene-words.json`, one set per setting kind (stage `other` names the person, `alone` has none), from the existing day-words machinery, the setting's organization and the scene's counterpart.

**Rules.** One engine, no per-scene path. No hand-written player text in code. It replaces the old call-or-letter-only setting line, which stays only as the fallback when no arrival is worded. Stopgap SG-WORDS-scene-arrival-time registered for the minute of the day.

**Done when.** In a played year of a generated world in a place drawn from all 56 (place and seed named), the first narration line of every staged scene names the day as people say it, never an ISO date, and names the person met. Test: `src/director/scene-opens-day-place-person.test.ts`.

**Files.** src/director/scene.ts,src/bench/story.ts,src/english/scene-words.ts,src/english/mined/scene-bank.ts,src/director/data/scene-rows.json,data/english/parts/scene-words.json

**Notes.** A purpose scene whose own setup names a different place than the arrival's setting kind is a possible later cleanup; the arrival is the scene's setting kind, the purpose's setup its task.
