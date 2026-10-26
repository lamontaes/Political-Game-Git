---
id: words-law-effect-learned-journal
title: "Words: a journal line for a resident who learns a law changed what their household pays"
area: words
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by: words/law-effect-learned-journal
pr: #6117
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T22:21:39.789Z
---

**What.** When a resident ties a bill their household paid to a law they heard about, the core writes an `event:law.effect-learned` record (`src/core2/modules/place-prices.ts`, on `claude/laws-end-to-end-proof`), and the director gives them the moment. The journal has no row or bank line for that event on main, so the resident's journal says nothing. The laws end-to-end proof (#5968) built a stopgap on its own branch: a journal row in `src/director/data/journal-rows.json` (`kindPrefix: "event:law.effect-learned"`, `entry: "story"`, the law named from the event's `billId` fact as `billName`) and two bank lines in `data/english/parts/journal.json`, "I found out the {law} changed what my household pays." and "I learned the {law} changed what my household pays.", both `shippable: false`. Merger 0 sent #5968 back on Oct 24 because those two files belong to the Words session. This item moves that slice to Words: add the row and the lines (these or better ones), grade them, and the proof drops its copy.

**Rules.** No hand-written player text: the words come from the English engine's bank, graded before they ship. Wire to the world: the line is composed from the event's own facts (the law's name), never typed in.

**Done when.** On main, `composeJournal` gives the resident in `src/core2/laws-end-to-end.test.ts`'s pinned seed (4a4e3819bc34b9d1e26d8413, Susupe, Northern Mariana Islands) a journal line naming the bottle deposit law from their `event:law.effect-learned` record, with the bank line graded shippable, and the test passes with that line read from the bank as it ships.

**Files.** src/director/data/journal-rows.json, data/english/parts/journal.json

**Notes.** From the laws lead, Oct 24, after Merger 0's send-back of #5968. The exact rows are in #5968's diff of those two files. `laws-end-to-end-proof` is blocked on this item and on `laws-end-to-end-screenshots`.
