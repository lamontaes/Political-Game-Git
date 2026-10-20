---
id: play-state-legislator-career-screen
title: "Play page: choose a numbered state legislative seat, file against its holder and follow the campaign"
area: play
kind: feature
priority: 3
size: L
status: in-pr
claimed-by: claude/fs11vb-scr
pr: #5664
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:13:54.720Z
---

**What.** The engine plays M5-01 (src/core2/state-legislator-career.test.ts passes on main), but the play page has no way to choose a numbered seat, file against its holder or follow the campaign. Add the screen: the player lists the seats covering their town by number and holder, picks one, files where that place files, and follows the campaign to the result. The player would pick the seat, see who holds it and watch the race.

**Rules.** Screens show record data and control names; no hand-written player text (words from the English engine). One rule, all 56 places: the seat list and filing come from the place's records. This is a game, not a spreadsheet: choosing and filing are one choice each, not a form. Read-only screens spend no game time.

**Done when.** In a played world (buildBenchWorld) in a drawn state and seed named in the PR body, the play page lists the numbered seats covering the player's town with their holders by record id, the player files for one and follows the campaign to the result, and the screen test and src/core2/state-legislator-career.test.ts pass. The owner plays it: pick a seat and run.

**Files.** src/bench, src/core2/state-legislator-career.test.ts, the play page screens

**Notes.** Split from office-m5-01-state-legislator-career, whose engine half was verified done Oct 20 (claude/m5-01-verified); this is the screen half the owner's note names (OPUS-PLAY).

Oct 20 (fs11vb): checked what the page already has before building. The government screen's records (`governmentView` in `src/bench/government.ts`) already list the seats covering the player's town with district and holder (term record id), the open contests with the filing office's rules checked for the person, and `fileForOffice` files; the clerk visit (`openBenchFilingVisit`) opens on any open contest, with its district in the title. Added `src/bench/state-legislator-screens.test.ts`, which plays that through the screen's own calls in the played world: in a drawn place (passed in Amanave, American Samoa, seed 8ad957cb…, seat `seat:US-AS:upper:At-large:0`, holder term `term:seat:US-AS:upper:At-large:0:2025-01-20`) it finds a race for a covering seat, an ordinary resident the rules let in files, and after election day the voting engine's result names that person on the ballot. What the page does not do, and this item does not build: draw the seat picker as a screen of its own. That is a design choice for the owner's play pass (the clerk visit already reads as choosing an office and filing), so the item stays for a decision on whether the clerk visit is the seat picker.
