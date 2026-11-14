---
id: director-manager-offer-only-stages-as-a-journal-line
title: "The campaign manager's offer never plays as a scene: the director stages it as a journal line"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: S4, Nov 14, while proving the office said in running text (PR 9197)
---

**What.** Someone close to a candidate offers to run the campaign, and the campaigns engine records it (volunteer-offered with role manager), but the director's schedule entry for that moment has outcome "journal-line" and no scene bindings, so the manager-offer scene in `src/director/data/situation-types.json` never plays. Seen: the Journal shows a line where a conversation at home should be, and the scenes written for the offer reach a reader only through the grading view.

**Cause.** Needs cause. Measured: Morganville, New Jersey (place key 3448030, seed cmp2:0): the offer is on the record, the entry's types are empty and its outcome is "journal-line". Pierpont, South Dakota (seed s3:1, the family's offer on 2025-03-08): "staged as a journal line". Across 24 other drawn places over three seeds (s1, s2, s3) the draw found no staged scene. Likely the offer's impact falls under the director's interrupt line (src/director/volunteer-offer-weight.test.ts reads that line) or a daily scene budget, but nobody has traced it.

**Fix.** Find why the schedule picks the journal line for a manager offer and let it stage as a scene when the offer is between people who are close, without lowering any threshold for other moments.

**Time box.** 2 hours, Opus medium. The builder of the campaign manager offer (#9158) owns the scene.

**Rules.** No dice: impact comes from the tie, the hours and the stakes; one rule for all 56 places.

**Done when.** In a drawn place (named with its seed) where someone close offers to run the campaign, the director stages the manager-offer scene and `purposeScene` composes it. A second session, on main, files for a race, waits for the offer and plays the scene at home.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/campaign-manager.test.ts, src/director/volunteer-offer-weight.test.ts

**Notes.** Filed by S4 from the Words lead's campaign manager reading (the father says "your campaign for State Representative", fixed in #9197 as a fact of the scene).
