---
id: play-one-person-shows-two-faces
title: "One character has two faces: light brown hair and pale skin on You, black hair and tan skin on Your life, and a mother who resembles neither (Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-play-one-person-shows-two-faces
pr: #8330
after:
blocked-on:
standard: 2
model: opus
effort: high
root: rc10-screens-keep-own-facts
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 4 "What a player sees", Pillar 6, and "Duplicate systems worth merging", item 4)
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:33:20.543Z
---

**What.** The audit measured on Nov 9 in Blodgett Landing, New Hampshire (a random world, no seed given) a 17-year-old player: "One person, two faces. The You screen's bust has light brown hair and pale skin. The Your life tab shows a full figure with black hair and tan skin. Her mother's bust resembles neither of them." The owner said the same on Nov 8, 2:10 p.m.: "I'm Mexican and my son is white. I don't know how that happened." The audit names the cause as duplicate drawing code: three ways to draw a face and six person cards. Fix the class: one face part and one picture source per person, read from that person's one looks record and used by every card, list, bust and menu; the other face parts and the duplicate cards are deleted.

**Cause.** Found in code: the three face parts are `headshot` (src/bench/ui/headshot.mjs, line 11), `bust` (src/bench/ui/strips.mjs, line 38) and `fillArtwork` (src/bench/ui/picture.mjs, line 12). The You bust is fed `faceOf` (src/bench/scene.ts, line 932) while the Your life figure is fed `portraitUrl` (src/bench/play.mjs, line 3167), which picks among the creator's portrait, the current scene's figure and the card's face. Which of those gave the second face in the audit's place was not traced.

**Fix.** First trace which source gave the second face in the audit's place. Then keep one face part and one picture source per person, read from the one looks record, move every card onto it, and delete the other face parts and duplicate cards (`memberCard`, `leaderBlock`, `personCardNode`, `candidate`, `savedLifeRow` and the Play as row are the candidates; the Notes list where each is). Read `.agents/skills/people-pack/SKILL.md` first.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the face parts and person cards that are not the one kept are deleted in the same change with their styles, and the PR body counts them. One model, two tiers: a counted person filled in on a click gets their face from the same rule and seed as a full person, so the same person comes back with the same face. Owner, Oct 28 (AGENTS.md): "It's just different ways of displaying the same information."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game through the creator in a drawn place (place and seed named) and takes screenshots at 1440x900 of every place the player's own face appears: the player card, You and its two other tabs, the talk box in one scene, People, the title's Continue and Saved games. Hair color, skin tone and the pack person are the same in all of them, and the proof names the one looks record id they were read from. It then opens each household member's card from People and from a scene and checks that a parent and child share the family's origin on their looks records. A search of src/bench finds one function that draws a face and one that draws a person card, and a test fails when a second is added. The same screenshots are taken in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro.

**Waits on.** Nothing for the one picture source per person. Do not redesign how a face is drawn or cropped: busts are coming and how they are shown is the owner's call (docs/coordination/OWNER-DECISIONS.md, Nov 10, "Staging waits for busts"). Keep the face part that stays easy to point at a bust.

**Files.** src/bench/ui/strips.mjs, src/bench/ui/picture.mjs, src/bench/play.mjs, src/bench/scene.ts, src/bench/whole-figures.ts, src/bench/ui/play-as.mjs

**Notes.** From the audit's Pillar 4 (measured in the browser life), Pillar 6 ("There are six ways to draw a person card and three ways to draw a face", read) and "Duplicate systems" item 4 ("I checked each item below in the code myself"). What the current code contradicts in the audit's account: `townRow` (`src/bench/ui/town-row.mjs`, line 19) draws a town in the creator's place list, not a person, so it is not a person card; a sixth place that does draw a person with its own layout is the Play as row (`src/bench/ui/play-as.mjs`, line 60). The others are as the audit says: `memberCard` (`ui/member-card.mjs`, line 15, three callers in `play.mjs`), `leaderBlock` (`ui/strips.mjs`, line 236, three callers), `personCardNode` (`play.mjs`, line 2217), `candidate` (`ui/strips.mjs`, line 545, a wrapper around a member card and stance rows) and `savedLifeRow` (`ui/strips.mjs`, line 314). Also read: `packPersonOf` in `src/bench/whole-figures.ts` (line 82) is written to give "the same person... everywhere" from one seed, and both the card and the scene build the person through `whoOf` (`scene.ts`, line 898), so the two faces may come from the creator's own portrait (`/api/portrait`, drawn from the looks recipe) standing beside the pack person; trace that first, in the audit's place, before deleting anything. The family's shared origin landed after the Nov 8 playtest (`src/core2/opening-origin.ts`; stopgap SG-PEOPLE-origin-skin-tones narrows the pack to three skin tones per origin), which may be why a mother still resembles neither. Related, filed Nov 10: play-your-life-draws-a-full-body-figure, play-new-game-and-creator-open-without-busts, play-six-list-and-detail-screens-build-their-own. Read `.agents/skills/people-pack/SKILL.md` first. Not verified by the audit: which code path produced each face.
