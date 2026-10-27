---
id: play-menu-shell-oct20
title: "Build the Oct 20 menu shell: icon rail, portrait opens You, News on the rail, Options on Esc"
area: play
kind: feature
priority: 2
size: L
status: done
claimed-by: screens/one-left-menu
pr: #6389
blocked-on:
source: "docs/coordination/OWNER-DECISIONS.md (Oct 20, the menu structure)"
claimed-at: 2026-10-27T20:05:50.568Z
---

**What.** Replace the live game's 11-item Menu panel and ring of icons with the owner's Oct 20 menu shell (docs/packages/M6-screens.md, "The menu shell"): the player card bottom left with the vertical icon rail above it (Journal, Calendar, Money, Politics, News, People, Travel; names on hover); clicking the portrait opens You with Work and study as its second tab; Politics tabs Government, Issues, Budgets, Parties, with Your office and Campaigns shown only when they apply; Options, the guide and Quit to title on the Esc key and the title screen; alerts as a toast, a dot on the rail icon, or a scene. Remove the description lines under menu items (hand-written text), the campaign "Today" list and the office tab's interrupt toggles. Use the approved mockups in docs/ui/mocks/screens-2026-10-14 for each screen's look.

**Rules.** Wire to the world: every rail button opens a screen that reads the player's real records, never a placeholder. Text only from records and the English engine, with control names from data/controls.json; Kit 13 look; no scrolling inside sheets; no top bar; a screen's look ships only on the owner's yes to a full-window screenshot.

**Done when.** The live game uses the shell, every rail entry opens its screen, and a full-window screenshot of each is in the PR for the owner.

**Files.** src/bench/play.html, src/bench/play.mjs, data/controls.json, docs/ui/mocks/screens-2026-10-14

**Notes.** The rail needs a News icon and the portrait needs a clickable state; the CTO paints both in the Kit 13 icon style. Playtest Oct 26 sitting 1 (installed v0.34.0): stale claim (in-pr on draft #5180, which is not menu work), size L. Rail and subheadings are split out as play-stop-39 and play-stop-40; set it open for the rest (Options to Esc, old Menu panel). Reopened by the CTO, Oct 26: stale claim (draft #5180 is not menu work); rail and subheadings split out as play-stop-39 and play-stop-40; open for the rest (Options to Esc, old Menu panel). Oct 27 (v0.56.2 sitting, screens designer): the owner again: "The left menu panel still duplicates the left icon rail: one of them goes"; OWNER-DECISIONS Oct 27 afternoon, "one left menu, not a panel duplicating the rail". Taken by the screens designer for the Menu-panel removal.
