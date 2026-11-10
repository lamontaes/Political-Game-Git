---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-5-large-debate-field
title: "A debate stages a field of up to 15 candidates"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: opus
effort: medium
root: rc7-player-cannot-drive
source: split from director-dev-and-play-missing-scene-kinds-the-owner-asked-for in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A debate is a sitting the player takes part in (kinds debate-invite and debate-sitting). Nothing in the elections engine makes a field of 15 or stages one. Make a debate sitting stage a field of up to 15 with every candidate on the contest answering, and sometimes just two or three, as the contest's own filings give. Seen: the debate scene with up to 15 candidates on the stage, or two or three when that is who filed.

**Cause.** Found in code: the `debate-sitting` kind (`src/director/data/situation-types.json` line 6029) and the meetings engine's debate-invited record (`src/core2/modules/meetings.ts` `takePart`, line 198); no cap or large-field case was found and none has been run. Design: the owner on Nov 8, "there's 15 people at the debates. Maybe sometimes, there's just 2 or 3".

**Fix.** Stage the debate sitting from the contest's filed candidates (all of them, up to 15), each answering from their own stance record, and add a dev mode recipe that causes a debate on a contest with many filings. If the field is too small in the drawn place, report that and use the existing test contest.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the scene's cause is a record an engine already keeps, or a registered stopgap naming the engine that should, and its ending moves something another engine reads. No dice: who joins, who carries and who shows up follow their records and reasons, never a roll. One rule, all 56 places: what an office may do is read from the place's data. This is a game, not a spreadsheet: the owner asked for this scene by name on Nov 8, and it adds no step the player must take.

**Done when.** A second session starts the bench in a drawn place (place and seed written down), opens dev mode's scene list, finds the debate kind and causes a debate on a contest with a large field, with a screenshot. It names the contest record id, the filed candidates and which of them answered, and the sitting's cast matches the contest's filings, up to 15.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts, src/core2/modules/elections.ts, src/bench/dev-mode.ts
