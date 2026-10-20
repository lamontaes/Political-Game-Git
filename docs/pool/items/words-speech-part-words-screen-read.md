---
id: words-speech-part-words-screen-read
title: "No screen or director scene reads the worded speech parts yet"
area: play
kind: wiring
priority: 3
size: M
status: blocked
claimed-by:
pr:
blocked-on:
after: words-speech-part-words,director-retire-stage-speech-builder
source: added with npm run pool -- add
---

**What.** When words-speech-part-words lands, the English engine words each speech part from its move and facts, but the play screen and the scenes must read those words. speechView in src/bench/campaign.ts shows the four choices and the picked parts as text, and speechGive returns speechText(build) and a scene; make those read the worded parts of whichever speech builder survives director-retire-stage-speech-builder, with each part's text carrying the record ids it rests on. The listener's scene built by speechScene should quote the finished speech through the address register and not a second wording. The old text path in the screen is deleted so one set of words reaches the player.

**Rules.** No hand-written player text: the screen shows only the engine's worded parts and control names, so no string for a speech part appears in src/bench/play.mjs or campaign.ts. Replace, never layer: the previous source of the part text is removed once the worded parts feed the screen. Ask why: each shown part keeps the record ids it cites, so a developer view can say why a part was offered. An effect is a read: speechGive and the director scene read the worded text, not a copy of it. One rule, all 56 places: the parts are built from the candidate's own records and never name a town.

**Done when.** A test beside src/bench/speech-screen.test.ts builds a speech from four picks in a played world (buildBenchWorld, a place drawn from all 56, a seed the builder did not choose), shows each offered and picked part is the engine's worded part with its cited record ids, gives the speech, and finds the listener scene quotes the same text; the test fails if a part has no cited record id.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/speech-screen.test.ts, src/director/speech-builder.ts

**Notes.** Oct 20 (pool feeder): spec written; the screen and give path already exist (speechView, speechGive), so this is only the read of the worded parts. It must wait for director-retire-stage-speech-builder so it edits the surviving builder, not the one being deleted.
