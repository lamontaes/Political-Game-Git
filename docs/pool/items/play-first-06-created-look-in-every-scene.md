---
id: play-first-06-created-look-in-every-scene
title: "The look you made is your face on every surface: card, Who you are, the opening and Continue"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-first-05-v1-figures-removed,play-stop-03-player-drawn-as-strangers
source: added with npm run pool -- add
---

**What.** In the v0.22.10 release the creator drew a blonde woman in a burgundy top, and play drew someone else in every scene; the talk box showed my portrait next to another person's name. Once the rooms draw the created look (play-stop-03), the other places a player sees themself must read the same record. This item makes every portrait and figure of the player read the one appearance record the creator saved.

**Rules.** Wire to the world: the creator's saved appearance is the one record every view of the player reads. Replace, never layer: one appearance per person, never a fresh pick per screen.

**Done when.** In a drawn place, after making a character, the player card, Who you are, the player's person card, the opening's family chapter and the title's Continue all show that look, checked by a test on the appearance record, shown by a screenshot of each.

**Files.** src/bench/appearance.ts, src/bench/card.ts, src/bench/opening.ts, src/bench/title.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
