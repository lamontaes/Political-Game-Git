---
id: scene-morning-after-the-race
title: "The morning after a race is a scene: the calls that come in, the signs coming down, the first words as winner-elect or as the one who lost"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/director-morning-after-the-race
pr: #6342
blocked-on:
source: 'owner''s "Morning after" request (docs/design/scenes/owner-scene-examples.md); words-and-scenes lead, Oct 27, scene web election-day pass'
lead: director
milestone: play-first
claimed-at: 2026-10-27T14:06:23.675Z
---

**What.** The owner asked for the morning after a race, and nothing stages it: `race-won` and `race-lost` fire at the cause, the night of the count, and the next day passes with no one. The packet `docs/design/scenes/from-life/the-morning-after-the-race.md` (four real races, calibration only) shows what the day holds. The winner gets calls, and the loser thanks the people who worked and says what comes next. The signs come down, and the volunteers are thanked or let go.

**Rules.** Serves `scene-standard`: the scene writes back (a thank-you, a promise, a call returned), and its people are cast from the campaign's own records (staff, volunteers, donors, the opponent). No dice: it fires from the election-result record, the day after, for the candidate. One rule, all 56 places.

**Done when.** A situation type stages the day after a candidate's election result, from the same `election-result` record, cast from the campaign's staff and volunteers and the household. In a buildBenchWorld drawn place (seed named), a test plays a filed candidate through election day and shows the scene staged on the next day, citing the result record by id. Its reply is written back as a `scene.reply` record. The words lead supplies its lines from the packet's "Lines the bank needs".

**Time box.** 3 hours.

**You will see.** The day after the count: a volunteer at the door with the last of the yard signs, asking what comes next.

**Screenshot.** The morning-after scene in the bench, with place and seed.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** Engine gaps the packet names: no transition record for a winner (offices) and no end-of-campaign step for volunteers or debt (campaigns).
