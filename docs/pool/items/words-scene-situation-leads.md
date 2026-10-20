---
id: words-scene-situation-leads
title: "Scene leads: the engine writes the sentence about what is happening for each situation type"
area: words
kind: feature
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: PR 5647 (words-authored-parts-shippable-sweep) is an unmerged draft, 'do not merge as is'; on main the lines still ship as authored shippable parts, so the slot is not empty and the rewritten test in the done-when does not exist yet. Needs the owner to grade the lines (the 5647 decision).
source: added with npm run pool -- add
---

**What.** The held hand-written sentences in data/english/parts/scene-words.json left the situation lead after a scene's setting sentences with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the situation lead after a scene's setting sentences from the scene's moment cause record (the death, birth, layoff or vote record), as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the situation lead after a scene's setting sentences is worded from engine or mined parts in data/english/parts/scene-words.json and cites the scene's moment cause record (the death, birth, layoff or vote record) by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/scene-words.json, src/director/scene.ts, src/director/scene-leads.test.ts, src/director/scene.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
