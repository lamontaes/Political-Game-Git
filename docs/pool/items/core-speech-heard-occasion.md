---
id: core-speech-heard-occasion
title: "A heard speech says what it was given at (campaign, meeting remark, hearing)"
area: core
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Every `speech.heard` record names what the speech was given at: a campaign stop, a remark at a meeting, a hearing, a party meeting, a press attack or a state address. Today the record carries only the speaker, so the director staged a mayor's remarks at council meetings as campaign events. Each producer writes the fact; the director's `speechOccasion` reads it first.

**Rules.** An effect is a read: the director reads the occasion when it binds a heard speech to a scene, so a campaign stop needs a campaign speech, not any remark. One rule, all 56 places: the fact comes from the producer, never from a place.

**Done when.** In a one-year run of `buildBenchWorld` at a drawn place, every `speech.heard` record has an `occasion` fact, and the stopgap `SG-DIRECTOR-speech-occasion` in `src/director/data/stopgaps.json` is resolved.

**Files.** src/core2/modules/speech.ts, src/core2/modules/campaigns.ts, src/core2/modules/meetings.ts, src/core2/modules/legislature.ts, src/core2/modules/parties.ts, src/core2/modules/press.ts, src/core2/office-day-state.ts

**Notes.** Found by the Words session reading batch 21 (Oct 20): `speech:remark:...` council remarks were bound to the campaign-stop situation. The director reads the id's shape until this lands.
