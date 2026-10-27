---
id: play-stop-31-creator-search-fields-gold-outline
title: "The state and town search fields have the slight gold outline like the other fields"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: play-first/play-stop-31-creator-search-fields-gold-outline
pr: #6244
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:20:27.255Z
---

**What.** The search box above the state list and the town list in the creator has no outline, while the other menus keep the slight gold edge the owner asked for. The owner: "I don't know why there's a search thing but ... there's no slight outline like I wanted on the other menus." The same sitting he said he really likes the state list's font ("I really like this menu font with the states"), so the list stays as it is. This item gives both search fields the gold outline at rest and on focus, and leaves the font and the list alone.

**Rules.** Serves LAW.md §10, The owner's read of the Oct 24 screenshots (panels keep the slight gold box permanently) and LAW.md §1, Screens and menus. This is a game, not a spreadsheet. Replace, never layer: one outline style for every creator field, not a second one for search.

**Done when.** In the creator in a drawn state at 1440x900, the fields data-testid state-search and place-search show a gold border at rest and on focus, checked in src/bench/creator-fields.browser.mjs by reading the computed border color against the Kit 13 gold used for the other fields, shown by a screenshot of the state list and the town list.

**Time box.** 1 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The search boxes in the state and town lists have the same slight gold outline as the rest of the creator.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/creator-fields.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "there's no slight outline like I wanted on the other menus." He also questioned why a search exists; the default here is to keep it with the outline (OD:215 bars a place search on the title itself, not in the creator's list). The CTO asks him only if he raises it again. play-first-03 gave the name and date fields their boxes; the search fields were left out. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
