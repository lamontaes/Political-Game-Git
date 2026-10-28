---
id: trim-main-every-duplicate-deleted
title: "Trim: every second engine, reader, renderer, unread table and proxy on main is deleted, one PR each, the game may break until the wires follow"
area: core
kind: feature
priority: 1
size: L
status: claimed
claimed-by: claude/trim-main
pr:
blocked-on:
source: added with npm run pool -- add
lead: cto
claimed-at: 2026-10-28T03:53:33.041Z
---

**What.** The owner (Oct 28): trimming is the first thing; all the deletions first, even if it breaks the game for a few hours, then the wiring; the guards are the bumpers. The list already exists on main and is the only brief: the deletion lines of docs/reports/engine-map-2026-10-28.md (its 31-line order: the opening box, picture table and castOf; newsStory and townStory in opening-story.ts; the map, law and changes sheets and /api/map; decideOnDesk and the second cabinet table; office-day-state.ts's own term writer; the director's own half-life rows; kinRelations and the eight prefix loops; the four unread past tables; the voting engine's stand-in filing; buildDeepPast and its callers once no reader needs it) and the 68 twins in docs/reports/duplicates-on-main-2026-10-28.md, each with the one that stays named. Delete the second one; where a reader depended on it, point the reader at the one that stays in the same PR if that is a one-line change, otherwise leave the reader red for the wiring pass and say so in the PR body. No wiring beyond that; no new code; no research.

**Rules.** Replace, never layer: every PR deletes and counts lines and files removed. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0); a reader left red is named in the PR body, not patched with a new path. The guards on main (zero-dice, old-imports, no-second-source, English, kit-only, one-history, engine families) must pass on every PR; a baseline that shrinks is updated in the same PR. Every cut corner is a registered stopgap.

**Done when.** Every deletion line in the engine map's order and every twin in the duplicates report is either deleted on main (PR number beside it in the report, added in the final PR) or kept with one sentence in the report saying why the rulings keep both; the kit-only and engine-family baselines are lower than at the start by the counts the PRs removed; the golden path's furthest step on main is named in the final channel block, red or not.

**Files.** src/core2,src/director,src/bench,src/simulation,docs/reports/engine-map-2026-10-28.md,docs/reports/duplicates-on-main-2026-10-28.md

**Notes.** Filed by the CTO Oct 28 on the owner's word (trim first). engine: the one that stays, per row of the two reports. guard: no-second-source, engine families, one-history, kit-only. Read: OWNER-DECISIONS (Oct 27 to 28), the engine map, the duplicates report, the retroactive audit; searched the pool for trim, dedupe, duplicate: director-opening-as-a-scene, play-opening-plays-in-the-talk-box, core-old-imports-opening-people are open rows this item consumes. Time box: until the list is empty or 12 hours.
