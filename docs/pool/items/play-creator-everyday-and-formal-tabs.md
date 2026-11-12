---
id: play-creator-everyday-and-formal-tabs
title: "The creator's How I look has two tabs, Everyday and Formal, and the bust flips between them"
area: play
kind: feature
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: opus-4a12
pr: #8905
after:
blocked-on:
lead: play-first
milestone: play-first
model: opus
effort: medium
root: none
source: The owner, Nov 12, 2026, about 12:55 p.m. ET ("two tabs, everyday and formal, bust flips between them", then "build the tabs"), through the CTO's builder brief
checked:
claimed-at: 2026-11-12
---

**What.** The creator's How I look offers only the formal clothes (shirt, tie, jacket); the everyday top a player wears away from work is the game's pick and cannot be chosen or seen in the creator. The owner asked for two tabs so the player chooses both looks and sees each one on the bust. Seen: New game at 1440x900, How I look shows Everyday and Formal tabs under the shared rows; the bust wears the open tab's clothes.

**Cause.** Found in code: src/bench/appearance.ts offered rows for skin, hair, hair color, facial hair, shirt, tie and jacket only (its header said everyday clothes are not chosen), `portraitFace` drew the look at work or in office only, and `bustOfLook` in src/bench/bust.ts picked the everyday top from a hash of the look.

**Fix.**

1. The look (`BustLook`) keeps an everyday `top` and `topColor`; `lookTop` in bust.ts returns the chosen one or, for a look that names none, the game's own pick; `bustOfLook` dresses everyday in it. Work is the shirt and tie without the jacket; office adds the jacket.
2. appearance.ts adds a Top row (each whole top the set paints in the manifest) and a Top color row (where the top is painted in more than one color), tagged Everyday; Shirt, Tie and Jacket are tagged Formal. The handler returns both busts.
3. play.mjs draws the shared rows, the two tabs on the one tab part, and the open tab's rows; a tab flips the bust from the busts already sent.

**Time box.** 3 hours for one Opus session.

**Rules.** Replace, never layer; no hand-written player text in code (words in controls.json, whole-figures.json and the bank's manifest names); the owner's menu look (a selected tab a lit brass fill, no hairline rings, no boxes, no captions).

**Done when.** A second session, on main at 1440x900, opens New game for a woman and a man each in a drawn place from Random place (named in the check's output), sees Everyday and Formal tabs under the shared rows, sees the bust wear a whole top on Everyday and the shirt (tie, jacket as chosen) on Formal, steps the Top row and sees the bust change, begins the life and sees the player's bust in that top away from work. src/bench/creator-look-tabs.browser.mjs passes on a fresh bench, and the creator unit test passes.

**Waits on.** Nothing.

**Files.** src/bench/bust.ts, src/bench/appearance.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json, src/bench/data/whole-figures.json, art/busts/v1/manifest.json, src/bench/creator-look-tabs.browser.mjs (new)

**You will see.** Under Skin, Hair and Hair color, two tabs: Everyday shows your top and its color, Formal your shirt, tie and jacket, and the bust beside the form changes clothes as you switch.

**Screenshot.** Both tabs for a man and a woman at 1440x900.

**Notes.** Built from the CTO's brief of Nov 12 by opus-4a12. The women's denim top (round 3, one color) is offered as a Top with no color row.
