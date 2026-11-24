---
id: screens-no-last-talked
title: "A person's card never shows 'Last talked'"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/no-last-talked
pr: #6417
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T21:45:25.657Z
---

**What.** The owner ruled at 5 PM on Oct 27 that 'Last talked' is never shown. The person card still carried a Last talked row with the date of the tie's last contact. The row is removed from the card, with its label.

**Rules.** This is a game, not a spreadsheet: a bookkeeping date the owner ruled out is removed, not reworded; replace, never layer, so the label goes from the controls in the same change.

**Done when.** In a drawn place (name the place and seed), src/bench/person-card.browser.mjs passes on a restarted bench and asserts the card shows no 'Last talked' text; a screenshot of the card is in the PR body beside the before shot.

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/person-card.browser.mjs

**Notes.** OWNER-DECISIONS Oct 27, 5 PM. lead: play-first.
