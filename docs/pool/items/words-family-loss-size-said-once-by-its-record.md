---
id: words-family-loss-size-said-once-by-its-record
title: "After a lost race the size of the loss is said once, and the money lines follow the gift's size"
area: director
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: 9512
blocked-on:
after:
source: Words lead's read of the Salado TX play (words-lead/regression/page-read-salado.md, class F case 4), Nov 15
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** After a lost race the household member, the player's replies and the concession call said "we lost by about 830 votes" three times, "closer than anybody expected" for a wide loss and "not much to lose by" for any size.
It was found reading the Salado TX play, class F case 4 of the Words lead's read.
Seen: the Salado TX play, seed review1:2.

**Cause.** Found in code: the `margin` fact set in src/director/family-stake.ts (lossStakeOf) was worded into eight household statements, two replies and a follow, and nothing read how the race was decided (`raceMargin` in src/director/race-margin.ts, which the Journal reads), so every line that judged the size asserted it.

**Fix.** The figure stays once, in the narration, and it is the votes the player came short of the last winning seat (the winner's own votes where one seat was filled), not the winner's total over theirs; the statements and replies lose it (rule 115). No line judges how close the count was: the lines that did ("It's hard to hear it was that close.", "How close was it?" with its close and wide answers, "It was close. I can live on that.", "Closer than anybody expected") are deleted, because their cutoffs (journalRaceCloseMargin, journalRaceWideMargin) were picked to feel right; the election results work brings the lines back on the recount rule, and the `race-close`, `race-wide` and `race-middle` scene facts are removed. The money statements follow the gift's size: `family-loss` has a `.small` variant read by `gift-size` (same formula and 0.05 parameter, the donor ask's picker), the gift riding the packet as `amountMinor`, and a scene now carries a `variant-<name>` fact so a line written for one arc plays only there; the three follows that answer money that hurt need the plain arc. No heavy-gift variant ships (see the item `words-family-loss-heavy-gift-needs-a-giver`). The household's parts come from the player's own presses on the campaign page (`campaignAct`), never written for anyone else, and the pinned test reads the scene for a played life (scripts/words/family-loss-life.ts), found by scripts/words/family-loss-life-scan.ts.

**Time box.** 4 hours for an Opus session.

**Rules.** No new threshold: `raceMargin` is the Journal's own. Replace, never layer: the old lines are deleted. A line nothing backs is deleted, not kept unplayed.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed) in a played life where the player files and presses the campaign page, that a lost race's scenes say the figure once and that no line says the count was close or wide. The pinned test src/director/family-loss-stake-scene.test.ts passes at its named life and names each scene's record id.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/family-loss-stake-scene.test.ts, src/director/family-stake.ts, scripts/words/family-loss-life.ts, scripts/words/family-loss-life-scan.ts, src/director/race-margin.ts, src/director/arc-variant.ts, src/director/data/arc-variants.json

**Notes.** Filed Nov 15 by hand with its PR. Some households now offer fewer replies (for example no thank-you or blame after "Tell me what happens now."): M5's read found those replies did not answer that line. The middle-margin answer waits on a drawn place that plays one.
