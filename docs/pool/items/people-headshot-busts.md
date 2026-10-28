---
id: people-headshot-busts
title: "Busts in the talk box and on Continue are cut through the face"
area: people
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/people-headshot-reader
pr: #6583
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T06:47:36.252Z
---

**What.** The bust beside a conversation and on the title's Continue crops the whole figure in CSS at a fixed spot (top center, 150% wide), so a figure whose head sits elsewhere is cut through the face (owner, Oct 28: 'looks like my guy is missing an eye'). The People map already draws a round headshot from the head box (ui/headshot.mjs, faceOf); the busts should use the same part.

**Rules.** One headshot part for every face; replace the CSS crop, never layer; controls through src/bench/ui/.

**Done when.** continue-face.browser.mjs passes with Continue drawing the creator's portrait as the headshot; a talk with an adult shows their headshot; screenshots of both on the bench.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/card.ts, src/bench/handler.ts, src/bench/appearance.ts

**Notes.** TODO
