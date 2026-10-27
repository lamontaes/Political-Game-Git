---
id: screens-travel-always-lists-places
title: "Travel always lists where the player can go, with what is open now, and has no 'You are at home' line"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/travel-always-lists-places
pr: #6385
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T19:56:39.669Z
---

**What.** In v0.56.2 Travel at 8:30 p.m. on the opening night listed no destinations at all, and showed "YOU ARE AT HOME" under its title. The owner: "Remove all those fucking subheadings. I hate them all." Travel must always list the places the player can go (home, work, school, the filing office, shops), each saying in words whether it is open now, and the panel must be sized to its rows, not a full-height sheet with a few lines top left.

**Rules.** This is a game, not a spreadsheet: a closed place is listed as closed, never hidden, so the player learns why. No hand-written player text: open and closed words come from the controls and English data. Replace, never layer: the subheading line is deleted, not hidden. One rule, all 56 places: destinations come from the drawn place's records.

**Done when.** In a drawn place on the opening night at 8:30 p.m. (name the place and seed), src/bench/travel.browser.mjs passes on a restarted bench and asserts at least three destinations are listed with an open-or-closed word each and no line reading you are at home; a 1440x900 screenshot is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Travel at night lists every place you can go, each marked open or closed, with no line under the title.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/map.ts, src/bench/travel.browser.mjs, src/bench/data/controls.json

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
