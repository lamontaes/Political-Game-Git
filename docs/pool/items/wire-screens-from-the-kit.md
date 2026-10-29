---
id: wire-screens-from-the-kit
title: "Every screen is a definition the UI kit draws: the missing parts added, every sheet migrated, the dead sheets deleted, screen math moved into engine views"
area: play
kind: feature
priority: 1
size: L
status: done
claimed-by: screens/kit-package
pr: #6594
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:25:29.284Z
---

**What.** Engine map lines 14 to 19 and the owner's one-UI-package ruling. Add the missing kit parts to src/bench/ui/ (pager with items and page size, section, select, search box, chart, newspaper page, calendar grid, people web, picture slot) and move the six local parts in src/bench/play.mjs into the kit. Make every screen a definition (type, sections, labels from src/bench/data/controls.json, record readers) that one renderer per menu type draws: Who you are and the Politics guide first, then the 20 partly-kit screens, one PR per menu type. Delete the map, law and changes sheets and /api/map. Move the typed English in play.mjs into banks through screenLine. Move screen-side counts and sums (vote tallies, budget totals, a seat's level) into engine views (seatView, budgetView, the offices table). One date wording and one money wording in src/english. The newspaper mockups are at art/newspaper-mockups/ on claude/people-rooms-art. Time box: 6 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guard: kit-only-ui (its baseline for play.mjs falls to zero), english. Every control from the kit; nothing invented; no subtitles; no box around a person; one Continue on a narration beat.

**Done when.** The kit-only guard's baseline reads zero for src/bench/play.mjs and dev.mjs; every screen opens in a drawn place (name it and the seed) with a before and after screenshot in each PR body; the map, law and changes sheets and /api/map are gone; the screen-side counts are gone from the bench (grep named).

**Files.** src/bench/ui/,src/bench/play.mjs,src/bench/play.html,src/bench/play.css,src/bench/data/controls.json,src/english

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: src/bench/ui/, screenLine, seatView, budgetView. guard: kit-only-ui, english. Read: OWNER-DECISIONS (one UI package, every piece from the kit, screens rulings), the engine map section 2. Starts now; does not wait on the trim.

Oct 29 (CTO): set done; PR #6594 merged (the done flip failed while branch protection refused the flip job's push).
