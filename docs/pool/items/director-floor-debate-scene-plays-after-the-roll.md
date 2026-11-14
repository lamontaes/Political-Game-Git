---
id: director-floor-debate-scene-plays-after-the-roll
title: "A floor-debate scene for a seated member plays the day after the vote, so its lines speak as if the roll were ahead"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: filed by hand by the meetings and floor builder, Nov 14 2026
checked: meetings and floor builder 2026-11-14
---

**What.** A floor-debate scene for a seated member plays the day after the vote, so its lines speak as if the roll were ahead

**Cause.** Found in code: a local board's chamberVote records the floor debate at the roll (src/core2/modules/legislature.ts, recordFloorDebate), and the director stages the circumstance the day after the record (src/director/ledger.ts produceCircumstances). Measured: at Delta City MS, Roy MT and Klamath Falls OR (seeds meet-a1:0 to :2) every one of six floor-debate scenes played the day after the meeting adjourned.

**Fix.** Record the debate when the meeting's agenda is posted (holdPlayerIfDue calls holdFloorDebate for a seated player), so the scene plays on the meeting day before the roll; word the scene by the body's size (small board, council, formal chamber from a tuned row), give the speaker a reason from the record, and add the second-turn replies so pressing a reply reaches the held-your-ground ending.

**Time box.** One session, one day.

**Rules.** One engine per mechanic; no new stopgaps; no figures or counts in any scene line; plain American English. Names the place and seed.

**Done when.** A second session seats a member at three drawn places (one small board, one council, one state chamber) and sees the floor-debate scene on the meeting day before the roll, in the body's own register, with a reason in the speaker's first line and a pressed reply ending in held-your-ground that the Journal records as a strained tie. Test: src/director/floor-debate-ahead.test.ts.

**Waits on.** Nothing.

**Files.** src/core2/modules/office-day.ts, src/director/floor-debate-facts.ts, src/director/purpose-scene.ts, src/director/data/scene-talk-rules.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Built by the meetings and floor builder; played lines in /mnt/project-files/words-lead/meetings-floor/lines.md.
