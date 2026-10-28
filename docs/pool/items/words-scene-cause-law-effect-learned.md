---
id: words-scene-cause-law-effect-learned
title: "A scene staged from a learned law cost never says what the law did to the household"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a resident ties a price change to a law from a story they heard, the director stages a law-takes-effect scene at home (the laws end-to-end proof, Susupe, Northern Mariana Islands, seed 4a4e3819bc34b9d1e26d8413, moment person_4c22f729ef7c5a6f:2025-02-03:event:law.effect-learned:...). With the scene bank's ungraded pieces let in, it says only the day, the setting and 'A law that reaches you has taken effect.' src/director/data/scene-rows.json has no cause row for the moment's label (cause:event:law.effect-learned), so the scene never says which law it was or that the household now pays more or less. The event's facts already hold the law's bill (billId), the price rule and the amount moved (movedMinor).

**Rules.** No hand-written player text: the sentence comes from the scene bank through the English engine, authored shippable: false until graded. Grounded: it names only facts the learned event records (the bill, the amount, the story it was learned from). Replace, never layer: one cause row, read by composeScene like the others.

**Done when.** src/director/data/scene-rows.json holds a cause row for cause:event:law.effect-learned, the scene bank holds at least two authored pieces for it (shippable: false), and src/core2/laws-end-to-end.test.ts, with ungraded pieces let in, shows the scene naming the law and what the household paid, citing the learned event's id.

**Files.** src/director/data/scene-rows.json, data/english/parts/scene-words.json, src/director/scene.ts, src/core2/laws-end-to-end.test.ts

**Notes.** Found by the laws lead on Oct 24 (branch claude/laws-end-to-end-proof).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the graded hold; ship the piece.
