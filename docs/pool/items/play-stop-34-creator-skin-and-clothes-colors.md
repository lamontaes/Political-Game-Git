---
id: play-stop-34-creator-skin-and-clothes-colors
title: "The creator offers skin tones and clothing colors as swatches and the figure shows them"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-34-creator-skin-and-clothes-colors
pr: #6229
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T05:20:02.154Z
---

**What.** The creator's appearance step has no skin tone and no clothing color, and every figure is one skin and a gray outfit. The owner: "No clothes colors either ... No skin colors or anything like that." The ruling is arrows or a gallery for shapes and color swatches for colors with an immediate preview (PR-screens:105). The v2 figures are flat pictures in one skin tone, so this item first makes a mask for the skin and for the clothing of each figure the creator offers, then draws any swatch by shifting hue, saturation and lightness inside its mask only, adds a Skin row and a Clothes color row of swatches, saves both on the look record and draws them in the preview and the room. Randomize changes both.

**Rules.** Serves LAW.md §2, People in rooms and figures ("Appearance selection uses direct arrows/gallery and color swatches"; every figure drawn from the person's own appearance record). This is a game, not a spreadsheet. Replace, never layer: one recolor path for the creator and every room. Follow the asset-scene-admission skill. No dice: a swatch is a record field the player or the world's people-builder sets; nothing is rolled at draw time.

**Done when.** In the creator in a drawn place at 1440x900, a Skin row and a Clothes color row show swatches; choosing a skin swatch changes only the skin region of the preview and choosing a clothes swatch changes only the clothing region, checked by a pixel test on the preview (pixels outside the mask are unchanged, the mask's mean hue differs between two swatches, no two swatches in a row share a color); Randomize changes both; the saved look carries both values and after Begin the player's figure in the living room shows them, shown by screenshots of the creator with three swatches and of the room. The range of skin tones runs from light to dark; the builder names the count in the PR body. If making masks for all figures passes the box, make masks for the creator's figures first and file the rest as a -b item.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The creator has color swatches for skin and for clothes; picking one recolors just that part of the figure at once, and the room shows the same colors.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/appearance.ts, src/bench/whole-figures.ts, src/bench/data/whole-figures.json, src/bench/creator.ts, src/bench/play.mjs, src/bench/play.css, art/people-engine/v2/index.json, art/people-engine/v2/figures, art/people-engine/v2/tools

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "No skin colors or anything like that." The look record gets its skin and color fields here; play-stop-33 adds hair on the same record, so either can land first. People other than the player are drawn from their own look in play-stop-35. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Sent back 2026-10-27 from PR #6229 (branch play-first/play-stop-34-creator-skin-and-clothes-colors): the picture-derived mask stand-in has no stopgap row or code marker; finish on that branch, merge main into it first.
- Merged Oct 27 in PR #6229; awaiting the owner's installed-build check.
