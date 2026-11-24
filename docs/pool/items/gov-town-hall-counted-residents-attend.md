---
id: gov-town-hall-counted-residents-attend
title: "A town hall or forum fills from the town's counted adults too, not only the few full people"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-town-hall-room-full-people)
lead: governing
standard: 2
model: sonnet
effort: medium
root: design-one-model-two-tiers
---

**What.** `townHallDrives` (src/core2/modules/meetings.ts) lists only the town's full adults, so in a town of mostly counted residents a candidate's forum or an official's town hall meets only people already filled in; counted adults never come, though public comment already reads them. A forum in such a town therefore draws almost no one, and a rule that applies only to full people is an unregistered placeholder. The fix reads the counted adults the way public comment does and fills each one in when they come. Seen: in the crowd a town hall or forum shows, and in the turnout line the paper reports.

**Cause.** Found in code: src/core2/modules/meetings.ts line 651 to 665, `townHallDrives` returns `townAdults(api)` (meetings.ts line 254, `peopleByPlace` full people only) and registers SG-GOV-town-hall-room-full-people; `commentSpeakers` (line 364 to 400) already adds `countedResidents(core)` filtered by `countedRecordOnly` and adult age.

**Fix.** In `townHallDrives`, build the candidate list as `commentSpeakers` does: full adults plus the town's counted adults (countedResidents filtered to the town, `countedRecordOnly`, age at or above the voting age), reading their question salience and drive from the counted record with the same `viewOn`/`groupStance` rule (`countedLean`, `countedStanceProfile`). Index by place or take the counted store's per-place members so the weekly town hall never scans the whole wider population; stop at the top `townHallSize` (40) by drive. In `holdTownHall`, call `fillInPerson(core, id)` (src/core2/state.ts line 2309) for each counted resident who is in the top set before the causes are written, so the impression and statement causes name a full person. A filled-in person must match the record (one model, two tiers). Delete the stopgap marker and mark SG-GOV-town-hall-room-full-people resolved.

**Time box.** 3 hours, one Sonnet session; when it runs out, push what passes and set the item back with a one-line note.

**Rules.** One model, two tiers; no dice (the room is the most driven by their traits and views, never a roll); speed (the town hall runs weekly: read the town's counted adults through the place index, never the whole wider population); player-screen-text.

**Done when.** A second session, in a drawn place built with buildBenchWorld (seed printed) where most adults are counted, holds a candidate's forum and a town hall and sees attendees that include residents who were counted before the call, now filled in, with the town hall row's `attendeeIds` and the cause ids naming them; the forum's `moved` count is no longer limited to the full people, SG-GOV-town-hall-room-full-people is resolved, `npm run speed:year` shows no year more than 20% slower than base, and the attendees' record matches what the counted record said.

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.ts, src/core2/meetings.test.ts, src/core2/meetings-counted-speakers.test.ts, src/core2/data/stopgaps/gov.json
