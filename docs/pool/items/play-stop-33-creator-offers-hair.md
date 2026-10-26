---
id: play-stop-33-creator-offers-hair
title: "The creator offers hair and the chosen hair is on the figure in the creator and in the room"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The creator's appearance step shows only Build and Clothes, and the figure is bald. The owner: "there's no hair for some reason. No clothes colors either, or the character creator is obviously off. No skin colors or anything like that." The v2 figure set has 108 hair pieces (art/people-engine/v2/hair, listed in index.json) but its README says "The heads are bald. The hair pieces still have to be fitted to each head," and the look record (LookRecipe in src/bench/appearance.ts) holds only sex, build and outfit. This item fits the hair pieces to the figures the creator and the opening use, adds a Hair row with arrows to the appearance step, saves the choice on the look record, and draws it in the preview and in the room. Randomize changes hair too.

**Rules.** Serves LAW.md §2, People in rooms and figures ("Appearance selection uses direct arrows/gallery and color swatches, with immediate safe preview"; "Every figure in a scene must be drawn from that person's own appearance record"; the Codex v2 set may be used, Oct 24 read). This is a game, not a spreadsheet. Replace, never layer: the bald figure is the same record plus a hair field, not a second drawing path. Follow the asset-scene-admission skill; no raster is enlarged to fit.

**Done when.** In the creator in a drawn place at 1440x900, a Hair row sits with Build and Clothes and its arrows step through the hair pieces that fit the chosen body; a test lists the hair ids reachable per sex and fails if a piece is unreachable or no figure fits the one chosen; three different pieces are shown on the preview figure with the hair sitting on the head (a test checks each piece's anchor falls inside the head box of its figure); Randomize changes the hair; the look saved with the character carries the hair id and after Begin the player's figure in the living room wears it, shown by screenshots of the creator and the room. If fitting all 389 figures runs past the box, fit the standing front figures the creator and the living room use first and file the rest as a -b item.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The creator's appearance step has a Hair choice with arrows; the figure grows the hair you pick, and the same hair is on you when the game starts.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/appearance.ts, src/bench/whole-figures.ts, src/bench/data/whole-figures.json, src/bench/creator.ts, src/bench/play.mjs, src/bench/play.css, art/people-engine/v2/index.json, art/people-engine/v2/hair, art/people-engine/v2/tools

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "there's no hair for some reason." play-first-05-v1-figures-removed noted that every v2 figure is bald with one skin tone and that people would stand generated-in from the appearance engine if the owner rejected that; this is that rejection. The Randomize button changed clothes only. Skin tone and color swatches are play-stop-34; people other than the player are play-stop-35. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
