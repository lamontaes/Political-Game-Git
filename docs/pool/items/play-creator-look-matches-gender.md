---
id: play-creator-look-matches-gender
title: "A man's character always has a man's body in the creator"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/creator-look-matches-gender
pr: #6430
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:28:18.514Z
---

**What.** The owner saw a male character step to a female body in the creator. The Build and Clothes arrows cannot cross sexes, but a look the page sends back after Undo or Reset, or after the gender changed, is read by the server without being checked against the chosen gender, and New game saves whatever look the page sent. This item redraws any look whose body does not match a man's or a woman's chosen gender on the right body, keeping its build, clothes and colors, in the creator route and at New game.

**Rules.** Every person drawn is the filled-in person: the player's figure comes from their own record, and the record's look matches the gender the player chose. One rule for every route that reads a look from the page, not a fix in one button.

**Done when.** A test in src/bench/creator.test.ts sends a woman's look with a male gender to the creator check and to New game and finds a man's body with the same build and skin; the bench check in a drawn place shows the creator preview stays a man's body after Undo.

**Files.** src/bench/appearance.ts, src/bench/creator.ts, src/bench/handler.ts, src/bench/creator.test.ts

**Notes.** TODO
