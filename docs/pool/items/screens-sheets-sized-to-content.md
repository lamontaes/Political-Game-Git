---
id: screens-sheets-sized-to-content
title: "Journal, Jobs and study and Who you are fill their panel or shrink to it, with no subheadings that restate the screen"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: screens/sheets-sized-to-content
pr: #6394
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T20:22:09.526Z
---

**What.** In v0.56.2 the owner said "there's so much dead space and empty space in these menus": Journal, Jobs and study and Who you are show a few lines top left of a full-height sheet. He also said "Remove all those fucking subheadings. I hate them all." Each of these screens must either size its panel to its content or lay its content out to fill the panel, and every subheading that restates the screen or a state is removed.

**Rules.** This is a game, not a spreadsheet: a screen is designed from the principles page, not a list of rows on a page. Replace, never layer: the full-height sheet rule is replaced for these screens, and the removed subheadings are counted. No hand-written player text. One rule, all 56 places.

**Done when.** In a drawn place (name the place and seed), a 1440x900 screenshot of each of the three screens is in the PR body beside its before shot, and a browser check on a restarted bench asserts each screen's content covers at least 70% of its panel's area or the panel is no taller than its content plus padding.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Journal, Jobs and study and Who you are show no empty half-screen and no subheading lines.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/sheets.browser.mjs

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
