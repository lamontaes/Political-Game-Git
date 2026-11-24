---
id: integration-english-ban-place-and-presence
title: "No line restates where the player is or who is there; a guard blocks their return"
area: words
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/integration-english-ban
pr: #6395
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado, as Carlos Washington)"
lead: words
milestone: play-first
claimed-at: 2026-10-27T19:39:30.000Z
---

**What.** The owner: "When it says you're in place or person is with you, I hate those. Remove every instance of that from the English engine. Block that. Remove every single hard-coded instance of that." Every "You're in {place}", "You're at {employer}", "You're home" and "{person} is with you / is there" piece goes from data/english, the corpus shapes that would mine them back go, the director's setting line for a place goes, and a test fails on any bank piece or code string in src/director, src/english or src/bench that says one.

**Rules.** scene-standard (narration never restates the screen); replace, never layer: the pieces, their shapes and the code that fed them are deleted in the same PR, counted. The words lead owns the banks: the PR carries Review: words.

**Done when.** tests/guards/no-place-or-presence-restated.test.ts passes on the branch and fails when one deleted piece is restored; no data/english/parts piece and no string in src/director, src/english or src/bench matches the ban; the director and English tests pass.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A scene opens with what happened, never "You're in Salida" or "Brian Shah is with you."

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** data/english/parts/scene-words.json, data/english/parts/scene-talk.json, scripts/english-corpus/shapes/scene-words.json, src/director/scene.ts, src/director/office-scene.ts, src/director/data/scene-rows.json, src/director/data/office-scene.json, tests/guards/no-place-or-presence-restated.test.ts

**Notes.** Earlier item words-scene-narration-does-not-restate-where-you-are covers the player's own home; this one bans the shape everywhere. Owner, Oct 27, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched docs/ for the subject.
