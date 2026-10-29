---
id: play-bill-on-paper-clickable
title: "Your bill opens as a paper document you read and click: title, sponsor, sections in plain words, the floor date and whip, and the estimate beside each clicked part"
area: play
kind: feature
priority: 1
size: M
status: done
claimed-by: play-first/play-bill-on-paper-clickable
pr: #6407
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T19:53:14.014Z
---

**What.** The owner ruled (Sept 25, Oct 14, Oct 26 sitting, OWNER-DECISIONS line 57): bills are on paper, every term clickable, an estimate beside it; the bill is the workspace. Today a filed bill is rows on the Government and Legislature panels (src/bench/legislature.ts, bill-tally.ts, seat-bill-text.ts) with the vote date and whip count from #6226, and the bill's wording comes from data/english/bill-names.json and bill-sections.json. Build the paper: opening the player's own bill, or any bill before a body, shows one document in the game's look, built from the shared parts in src/bench/ui/: title and number, sponsor and cosponsors by name, each section in the English engine's plain words, the vote scheduled and the whip count, and the record of the vote and the signature when they exist. Clicking a section or a term shows beside it what the simulation estimates it does (the dollars, the people reached, the law it changes), read from the existing law and budget records, never computed on the screen. The rows it replaces are deleted. Time box: 3 hours.

**Rules.** No hand-written player text in code: section words from data/english banks (bill-sections.json, bill-names.json), labels from src/bench/data/controls.json; screens show record data only through worded labels (player-screen-text). Build every control from src/bench/ui/ (screen-to-mock). Replace, never layer: the bill rows the paper replaces are deleted in the same PR and counted. One rule, all 56 places: a town ordinance, a state bill and a federal bill open the same paper from their own records. An effect is a read: the estimate beside a clicked term reads the law and budget records, it never keeps a copy.

**Done when.** In a drawn place from all 56 (name it and the seed), with the player's filed bill and one other bill before the same body: a screenshot of each opened as the paper, with title, sponsor, sections in plain words, the floor date and whip; a screenshot after clicking one section showing the estimate beside it, naming the record ids it read; the old bill rows gone (grep named in the PR body); the browser check for the Legislature screen passes on a restarted bench.

**Files.** src/bench/legislature.ts,src/bench/bill-tally.ts,src/bench/seat-bill-text.ts,src/bench/ui/,src/bench/data/controls.json,data/english/bill-sections.json,data/english/bill-names.json

**Notes.** Filed by the CTO Oct 27 19:50 UTC for the owner's own choice of a bounded feature to hand to another model. lead: play-first. milestone: play-first. Read: OWNER-DECISIONS (bills on paper, Sept 25, Oct 14, Oct 26), DECISION-REGISTER (Legislative Content Menus, Proposal V1), prior-rulings, LAW; searched docs/pool/items for bill-on-paper: none.
