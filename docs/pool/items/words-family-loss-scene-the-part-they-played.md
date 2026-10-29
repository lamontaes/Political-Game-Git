---
id: words-family-loss-scene-the-part-they-played
title: "The talk at home after a lost race comes from a relative who put work or money into it, and what you say decides whether the household backs the next run"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: director
claimed-at: 2026-10-27T06:07:27.504Z
---

**What.** After a race is lost, the household talk is staged for every relative today, with generic comfort lines such as 'Come to bed. It'll still be true in the morning.', and it writes nothing the next election reads. This item casts the scene only for a household member the records show put something in (they are counted among the campaign's volunteers, or the candidate gave their own money), opens on what they put in and how close the count was, and writes the reply where the next candidacy decision reads it. Episode: the night after a first loss, from local candidates who lost by a few dozen votes and ran again (Jefferson City 2013, Raincross 2019 and 2024).

**Rules.** Serves scene-standard rule 1 (no consequence, no scene) and rule 2 (cast from the world), and wire-to-the-world: the household's backing is read by the candidacy engine when the person weighs the next contest. No dice: the relative's answer follows their traits and the tie, never a chance.

**Done when.** In a drawn place after a lost race where a household member is on the campaign's volunteer list or the candidate gave their own money, the family-loss scene is staged for that member, opens on what they put in, and has four replies that are four stances; with neither record no scene is staged; the reply to running again writes a record that candidacyReasons reads as a pull for the next contest, shown by a test in buildBenchWorld naming the place, the seed and the record ids; the Oct 15 comfort lines the scene replaces are deleted.

**Files.** src/director/family-stake.ts, src/director/purpose-scene.ts, src/core2/modules/candidacy.ts, data/english/parts/scene-talk.json

**Notes.** Lead: words. Scene builder A, episode 2, stacked on #6237 (episode 1). Packet: docs/design/scenes/from-life/household-after-the-loss.md.

**Notes.** Researcher hand-off (Scene researcher A, Oct 27, after the CTO's change of role). Packet: `docs/design/scenes/from-life/household-after-the-loss.md`.
- **Trigger record:** `election-result:<contest>` (voting engine), a loss for a person with a household. **Place kind:** home. **Cast rule:** a household adult who put something in, read from records: `volunteerIds` on the campaign row (`filing:<contest>:<person>`) or the candidate's own gift (`gifts` table, `<filing>|<person>`); none, no scene. **Outcome write:** the reply "I will run again" carries the relative's answer as `backing` (behind or doubts) on `scene.reply`; the candidacy engine keeps it and `candidacyReasons` adds `householdBacking` for the next contest.
- **Reference build, not for merge as is:** branch `claude/scene-family-loss-worked-it` (stacked on `claude/scene-family-filing-stake`, #6237) holds a working version with tests (`family-loss-stake-scene.test.ts`, drawn places, green): `family-stake.ts` (stakes from records), a `household-stake` fill in `scheduling.ts`, the outcome write in `purpose-scene.ts`, `noteHouseholdBacking` in `candidacy.ts`. The director engineer may lift, rewrite or discard it; the packet and this list are the finding.
- **Lines drafted to scene-standard rule 4** (in the branch's `data/english/parts/scene-talk.json`, `family-loss`, requiring `stake-worked` or `stake-gave`; versions by bearing; four stances thank / blame / deflect / promise). Examples: opener (worked, tender) "I worked this race with you. We lost by {margin}, and I'd work it again."; (worked, guarded) "We lost by {margin}. I put my time in too, so tell me what you want from me next."; (gave, hurt) "{given} of ours went in, and we lost by {margin}. Say something to me."; replies "You gave it your time when you didn't have to. I won't forget that." / "We lost by {margin}. That's on me, not on you." / "Not tonight. Ask me in the morning." / "I'll run again. Next time we start earlier and count what it costs first."; answers behind "Then count me in. Tell me when you decide." and doubting "Again? Tell me what's different next time."
- Deleted in the branch (Oct 15 lines the scene replaces): "Come to bed. It'll still be true in the morning.", "Your phone's off. Your sister called twice." (a sister the record never names), "You knocked every door on our street. I watched.", and nine more.
