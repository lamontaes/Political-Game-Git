---
id: words-scenes-like-wildermyth
title: "Scenes like Wildermyth's: cast from the people you know, voiced by who they are, and changing them for good"
area: words
kind: feature
priority: 2
size: L
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner named Wildermyth's scene system, and the generation that leads into it, as the model for our scenes (Oct 24, to the Words session), though not its comic-strip panels. It does three things ours does not do yet. It casts a scene from the people you already know by what fits them (two rivals, a friend in trouble), so scenes chain as a relationship grows. It voices a line by the speaker's personality, so the same scene reads differently for a hothead and a poet without becoming a new scene. And a choice changes the people for good (a new trait, a step in a relationship, a scar), written to their history and read by later scenes. On main today the director casts a scene from the records behind its cause, the English engine weighs pieces by the speaker's traits and bearing, and a scene with a purpose ends resolved or refused but writes nothing back to the world: src/director/scene-talk.ts records no outcome, and only the review page composes it. Split this into sub-items in that order of value, starting with a scene's outcome written to the world.

**Rules.** Wire to the world: a scene's result moves a relationship, a promise, a vote or a view that another engine reads, named by record id. No dice: casting and voicing come from traits, relationships and records, never a roll or a fixed chance. No proprietary material from other games: the design is the model, and none of its text or data is copied.

**Done when.** The item is split into S or M sub-items in the pool, each with its own done-when, and the first of them, a scene with a purpose writing its outcome to the world, is proven in a played world (buildBenchWorld) where another engine reads that outcome by record id.

**Files.** src/director/scene-talk.ts, src/director/scheduling.ts, src/english/calibration.ts, data/english/parts/scene-talk.json

**Notes.** Build on #5358 (the seam), which moves scene-talk wording to src/english/scene-talk-words.ts; writing the outcome belongs to the director.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): roll-up and twin of words-scene-ending-writes-its-record and the words-scene-web items; the children carry the work.
