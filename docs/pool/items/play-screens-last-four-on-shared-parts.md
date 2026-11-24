---
id: play-screens-last-four-on-shared-parts
title: "The dossier, the opening box, the debate panel and the speech panel draw through the shared parts, and their own drawing code is deleted"
area: play
kind: feature
priority: 1
size: M
status: done
claimed-by: play-first/play-screens-last-four
pr: #6357
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T16:35:50.686Z
---

**What.** The screens lead finished the twelve shared parts in src/bench/ui/ (panel, button, list-row, card, tab, menu, rail, talk-box, toast, dom) and every play-screen control builds from them, except four: the player dossier, the opening box, the debate panel and the speech panel still draw themselves with their own markup and styles. The owner ruled one UI system (OWNER-DECISIONS, Oct 26 evening: one UI, one scene system). Move each of the four onto the shared parts and delete its own drawing code and styles in the same change, replace never layer. Time box: 4 hours, one PR per screen allowed, all four in the box.

**Rules.** Replace, never layer: the old markup, styles and helpers for each of the four are deleted in the same PR and the body counts what was removed. Build every control through src/bench/ui/ parts (screen-to-mock). No hand-written player text; labels come from src/bench/data/controls.json. Restart the bench before a browser check, since controls.json loads at server start.

**Done when.** In a drawn place from all 56 (name the place and seed), a screenshot of each of the four screens attached to the PR body shows it built from the shared parts; grep of src/bench for the four screens' old renderer functions and their style blocks returns nothing; the existing browser checks for the dossier, debate and speech screens pass on a restarted bench; the PR body counts the lines and files removed.

**Files.** src/bench/play.mjs,src/bench/ui/,src/bench/data/controls.json

**Notes.** Filed by the CTO Oct 27 15:55 UTC from the screens lead's last block (10:40 UTC): these four were left off the shared parts. lead: play-first. milestone: play-first. Read: OWNER-DECISIONS (Oct 26 evening one UI ruling), DECISION-REGISTER, prior-rulings, LAW; searched docs/ for dossier, opening box, debate panel: no earlier item.
