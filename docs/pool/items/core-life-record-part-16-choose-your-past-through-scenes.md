---
id: core-life-record-part-16-choose-your-past-through-scenes
title: "The life record, part 16: after early access, the player chooses parts of their own past through scenes"
area: people
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
after: core-life-record-part-12-an-arrest-before-the-start
blocked-on:
lead: lives
model: opus
effort: high
root: design-life-record
source: owner, Nov 12, 2026, 6:33 p.m. (passed on by the CTO on #8928), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
---

**What.** The owner, Nov 12, on whether the player's own character may start with an arrest: the player's past follows the same rule as everyone's, and "after early access would like to let the player choose through scenes". Today a new life opens with a past the engines wrote for the player, and the player has no say in it. Seen: the new-life opening, where scenes from the player's past ask what happened, and then the player's card and Journal, which tell what was chosen.

**Cause.** Found in code: `openWholePast` (src/core2/modules/people.ts line 595) runs the past passes for the player exactly as for anyone. They are school, work, moves, service and arrests, each from the person's own seeded line (`pastArrestOf` in src/core2/past-justice.ts, `serviceOf` in src/core2/past-work.ts). Nothing the player does before or at the start reaches those lines. This is the owner's ruling and not a defect: the item is the later choice he asked for.

**Fix.** After early access, and only after the owner rules on its shape: a short run of opening scenes, cast by the director from the player's own drawn past, each offering the turns the engines allow at that age. Examples are staying in school or leaving, enlisting, and a run-in with the law. The choice is written as the same record kinds the past passes write, in place of the drawn one, so every view reads it unchanged. The rates still check totals over the whole world; the player is one person and does not move them.

**Time box.** 16 hours for one Opus session, after the owner rules on the shape (which turns, how many scenes).

**Rules.** One engine: the past passes write the records, and the scenes only pick among what they allow. No dice. Story writes the lines (`scene-standard`).

**Done when.** On a new life, the opening offers at least three turns of the player's past, and the card and Journal tell the one chosen with its year. Trace on each opens the record the past pass wrote. A second session sees it on main in a drawn place.

**Waits on.** Early access, by the owner's word ("after early access"), and his ruling on which turns are offered.

**Files.** src/core2/modules/people.ts, src/core2/past-justice.ts, src/core2/past-work.ts, src/director
