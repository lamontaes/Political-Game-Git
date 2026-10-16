---
id: words-bench-compose
title: "The grading bench composes each staged scene once per personality profile"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: words-bench-stage
source: added with npm run pool -- add
---

**What.** Compose each staged scene through the real engine once per personality profile. Profiles are trait vectors in `src/director/data/grading-profiles.json`, 5 to 8 of them, with trait names and levels from the game's own trait list (`docs/coordination/traits.md`, `src/core2/data/people/*`): warm, cold, stubborn, anxious, boastful, liar and two mixes. The profile is laid over the speaking character, and over the player for the four replies; for the lie set the player's lie trait is scaled up. For each staged scene the bench composes the narration (`composeScene`), the lines (`openConversation`, `say`), a speech where the situation has one (`composeAddress`) and the journal entry (`composeJournal`), plus the four replies and the lies, calling the same functions play calls. `--profiles N` takes the first N. A profile names no scene and no line.

**Rules.** No hand-written player text: every word comes from the English engine's banks in `data/english/parts/`, nothing is typed into code or a screen; no dice: profiles vary by traits, never a roll; one rule, all 56 places: the place is drawn from all 56 and named; American English (`npm run spelling`); speed: the bench reuses one cached world and adds no new world run. An effect is a read, not a record: the profile changes only the trait values the engine already reads; replace, never layer: no scenario text or scene script is added.

**Done when.** On the staged scenes of one cached year in a place drawn from all 56 (name it and the seed), each scene is composed N times and a test shows two profiles on one scene produce different piece choices for at least one scene, with every composed line carrying the ids of its pieces and the records that filled its slots.

**Files.** scripts/dialogue-batch/grading-bench.ts, src/director/data/grading-profiles.json (new), src/director/conversation.ts (read only), src/presentation/english-composition.ts (read only)

**Notes.** Part of words-grading-bench. Takes the staged scenes from words-bench-stage.
