---
id: art-figure-set
title: "The layered figure set and seated rooms (#4283)"
area: art
kind: feature
priority: 2
status: open
claimed-by:
pr: #4283
blocked-on:
milestone:
source: "astra order 5; PR #4283 branch codex/seat-slots-person-masks"
claimed-at:
---

**What.** 8 poses x 6 bodies with age, skin, hair, outfit and hands as layers, flat midday light, fixed baseline and eye row, transparent, with figures.json of anchors and scale, and three test composites (council chamber, state house, Senate, full and a third full, midday and night). Keep the chair maps and furniture masks; drop the cut-out people. Then the play renderer draws rooms from the slots and the v1 figures are removed.

**Rules.** Replace, never layer; the owner approves by looking at the composites.

**Done when.** Three composites approved by the owner, each shown as a screenshot at midday and at night in the PR body; the v1 figures removed in the same change. **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Files.** art/people-engine/v2/

**Notes.** None.

Sent back 2026-10-23 from PR #4283 (branch codex/seat-slots-person-masks): No fixing commit follows the Prettier/release-check send-back on this head. Rechecked unchanged head acb62cfcd1; exact prior review: https://github.com/lamontaes/Political-Game-Git/pull/4283#issuecomment-6281003298; finish on that branch, merge main into it first.

Note 2026-10-27 (people-in-rooms builder): the owner's Oct 27 order deletes art/seat-slots (nothing read it). What in a room stands in front of a person now comes from a depth map per painting (art/backdrops/occluders, scripts/people/occluders.py) and the seats' position, size and facing come from the owner's mannequin plates into art/backdrops/staging.json; the chair maps and furniture masks this item meant to keep are replaced by those, and the cut-out people are gone with the folder. PR #4283's seat-slots branch is superseded on that part.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built / SUPERSEDED (item Notes 2026-10-27; PR #4283 stale).
