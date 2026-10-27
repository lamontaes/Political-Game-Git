---
id: play-stop-28-title-panel-header-separated
title: "The game's name in the title panel is set apart from the menu under it"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: play-first/play-stop-28-title-panel-header-separated
pr: #6205
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T01:22:41.165Z
---

**What.** On the title and New game panels the gold game name sits directly on top of the first menu entry, and only the change in font tells the header from the buttons. The header and the buttons read as one block. The owner: "I don't like just the gold Our Civic Duty with like no delineation between that and the menu other than the change in the font." This item puts a visible break between the name and the menu, drawn from the Kit 13 pieces (a thin gold rule or plate with room above and below), on the title menu, the New game choice and the creator's panel header.

**Rules.** Serves LAW.md §1, Screens and menus (Title/home controls read as bespoke game UI integrated with the visual identity, REG:732; the panels keep the slight gold box, §10). This is a game, not a spreadsheet. Replace, never layer: one header treatment for every title-side panel, not a new one beside the old.

**Done when.** On the title menu, the New game choice and the creator in a drawn place at 1440x900, a browser check shows the header and the first control separated by a drawn rule or border element and a gap, read from computed layout (the header's bottom edge to the first control's top edge, with a rule element between them), shown by a screenshot of each of the three panels.

**Time box.** 1 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The gold name at the top of the title panel has a line or plate under it, then the menu, so the two read as separate things.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/play.html, src/bench/creator-fields.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "I don't like just the gold Our Civic Duty with like no delineation between that and the menu other than the change in the font." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. Panel markup is in #front of src/bench/play.html. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
