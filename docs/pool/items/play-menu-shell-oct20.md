---
id: play-menu-shell-oct20
title: "Build the Oct 20 menu shell: icon rail, portrait opens You, News on the rail, Options on Esc"
area: play
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: "docs/coordination/OWNER-DECISIONS.md (Oct 20, the menu structure)"
---

**What.** Replace the live game's 11-item Menu panel and ring of icons with the owner's Oct 20 menu shell (docs/packages/M6-screens.md, "The menu shell"): the player card bottom left with the vertical icon rail above it (Journal, Calendar, Money, Politics, News, People, Travel; names on hover); clicking the portrait opens You with Work and study as its second tab; Politics tabs Government, Issues, Budgets, Parties, with Your office and Campaigns shown only when they apply; Options, the guide and Quit to title on the Esc key and the title screen; alerts as a toast, a dot on the rail icon, or a scene. Remove the description lines under menu items (hand-written text), the campaign "Today" list and the office tab's interrupt toggles. Use the approved mockups in docs/ui/mocks/screens-2026-10-14 for each screen's look.

**Rules.** Wire to the world: every rail button opens a screen that reads the player's real records, never a placeholder. Text only from records and the English engine, with control names from data/controls.json; Kit 13 look; no scrolling inside sheets; no top bar; a screen's look ships only on the owner's yes to a full-window screenshot.

**Done when.** The live game uses the shell, every rail entry opens its screen, and a full-window screenshot of each is in the PR for the owner.

**Files.** src/bench/play.html, src/bench/play.mjs, data/controls.json, docs/ui/mocks/screens-2026-10-14

**Notes.** The rail needs a News icon and the portrait needs a clickable state; the CTO paints both in the Kit 13 icon style.

**Built Oct 20 (claude/political-game-pool-76ksvw, PR #5180), not finished.** Done: the 11-item Menu panel is deleted (HTML, CSS, JS); the seven rail icons stand in a vertical rail above the player card, names on hover; a News icon was added (a line-drawn stand-in: the CTO paints the final one in Kit 13); the portrait is clickable and opens You, with Work and study as its second tab; Options and Guide are tabs of one Options screen opened by Esc (Quit to title is in it); Politics tabs read Government, Issues, Budgets, Parties, with Your office only while you hold a seat and Campaigns only once you have filed; the description lines under menu items and the office tab interrupt toggles are gone. Browser checks (sheets.browser.mjs passes on all 11 doors twice; no-scroll.browser.mjs now opens every door and still fails only on the Politics sheet, 24 px over on main too: filed as play-politics-sheet-overflows-24px). Full-window screenshots: docs/ui/shell-2026-10-20/. Not done: alerts as a toast top right and a dot on a rail icon (nothing in the game raises them yet); the campaign Today list stays because doors, calls and fundraising have no scene yet (filed as play-campaign-day-acts-as-scenes); the owner has not said yes to the look. The server route /api/office/stops now has no screen calling it.
