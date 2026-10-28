---
id: screens-ui-panel-frame
title: "Consolidate the remaining shared panel frame markup"
area: play
kind: cleanup
priority: 2
size: S
status: done
claimed-by:
pr: #6191
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** The screens work order requires one shared panel frame template, while the first panel PR consolidates only close buttons and the visibility helper. Keep that first bounded change useful without calling the broader template requirement complete. Replace the remaining repeated panel frame markup through the existing shared UI part and preserve its visual appearance.

**Rules.** Replace, never layer; follow the screens work order and approved Kit 13 look. Use the same shared panel module and do not create a second UI framework or change player controls.

**Done when.** Record that each applicable panel frame uses one shared template and the repeated original frame markup is removed. Run the card, character and no-scroll browser checks in a drawn place and compare before and after screenshots at 1440x900, naming the seed and place.

**Files.** src/bench/ui/panel.mjs, src/bench/play.html, src/bench/play.mjs, src/bench/play.css, docs/work-orders/lead-screens-2026-10-26.md

**Notes.** TODO

Sent back 2026-10-27 from PR #6191 (branch claude/screens-ui-panel-frame): Clean main integration but explicit parent merge order still unmet:6187 f86b9761,6188 8a0c9721,6189 bbc66a36 remainOPEN. Diff24files carries those implementations, not just shared header;6187 has unresolved clerk-introduction and mandatory >4race witness acceptance. Land repaired chain first then merge main and gate bounded panel slice. No runtime or merge claimed; finish on that branch, merge main into it first.
Merged Oct 27 in PR #6191
