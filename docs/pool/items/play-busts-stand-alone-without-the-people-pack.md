---
id: play-busts-stand-alone-without-the-people-pack
title: "A bust needs no full-body figure: the bust bank holds its own people, and a face is the bust alone"
area: play
kind: cleanup
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: "owner, Nov 10, 2026, about 9:24 p.m. and 9:27 p.m. (no people in rooms; full bodies set aside until after early access); the CTO's order on #7365"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
---

**What.** The owner ruled on Nov 10, 2026: "Remove all the people," and then: "people will eventually be in the game, but right now for early access, it's just we have to do the busts." The full-body system is set aside (docs/art/full-body-people-after-early-access.md), and it cannot move while busts lean on it. Today a bust takes its skin tone from the full-body pack, and a person with no full-body figure gets no face at all. This is step 1 of that record: busts stand alone, and nothing a player sees changes. Feeds: play-rooms-are-the-painting-and-people-are-busts

**Cause.** Found in code: `headOf` in src/bench/bust.ts (line 80) ranks skin tones by reading `packPeople()` from src/bench/people-pack.ts, whose only source is art/people-engine/v4/manifest.json. `packPersonOf` in src/bench/whole-figures.ts (line 89) picks one of the pack's six people. `faceOf` in src/bench/scene.ts (line 936) returns null when `portraitFigure` finds no figure, and `headshot` (src/bench/ui/headshot.mjs, lines 27 to 41) and `bustOf` (src/bench/ui/strips.mjs, lines 43 to 55) fall back to cropping a full figure when a face has no bust.

**Fix.** Move the six people's id, sex and skin into the bust bank's manifest (art/busts/v1/manifest.json), read by src/bench/bust.ts alone, and have `packPersonOf` and `headOf` read that. Rebuild `faceOf` and `portraitFace` on `bustOf` alone and drop `url`, `head`, `width` and `height` from `PersonFace`. Delete the two crop fallbacks and `portraitFigure`. Delete `figureUrl: face?.url` at the four `showPerson` call sites in src/bench/play.mjs, which nothing reads.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the crop fallbacks and the figure fields are deleted in the same change, and the PR body counts what was removed. One screen part per kind of thing: every face on a menu comes from `faceOf` and is drawn by src/bench/ui/bust.mjs. No dice: which hair a person has is seeded generation of who exists, never a choice about what anyone does.

**Done when.** A second session, not the builder, starts the bench on main in a drawn place (named, with its seed), opens You, People, Politics (Government) and a person card, and sees a bust for every person shown, the same bust for the same person on each. `git grep -n "people-pack" src/bench/bust.ts src/bench/scene.ts` shows no import used for a face, and `git grep -n "face.url\|figureUrl" src/bench/ui src/bench/play.mjs` returns nothing.

**Waits on.** Nothing.

**Files.** src/bench/bust.ts, art/busts/v1/manifest.json, src/bench/whole-figures.ts, src/bench/scene.ts, src/bench/appearance.ts, src/bench/ui/headshot.mjs, src/bench/ui/strips.mjs, src/bench/play.mjs, src/bench/bust.test.ts, src/bench/government.test.ts, src/core2/opening-origin.test.ts

**Notes.** The files marked new arrive with #8442; they are not on main as this item is written.

Waits on cleared (Nov 11, 2026, cause finder for Fable B): #8442 and #8448 closed without merging, but the bust bank is on main all the same (src/bench/bust.ts, src/bench/ui/bust.mjs, src/bench/bust.test.ts and art/busts/v1/manifest.json all exist on main), so nothing is waited on and the files are no longer new.
