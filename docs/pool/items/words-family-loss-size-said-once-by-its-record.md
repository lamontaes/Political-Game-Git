---
id: words-family-loss-size-said-once-by-its-record
title: "After a lost race the size of the loss is said once, and size words come from how the count was decided"
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

**Fix.** The figure stays once, in the narration, and it is the votes the player came short of the last winning seat (the winner's own votes where one seat was filled), not the winner's total over theirs; the statements and replies lose it (rule 115); purposeScene sets `race-close`, `race-middle` or `race-wide` from `raceMargin`, which reads the loser's own gap to the last seat against the Journal's two parameters; "How close was it?" is answered close and wide (the middle answer was cut: no drawn place played a middle count); "It's hard to hear it was that close." and the two close answers need `race-close`; "Closer than anybody expected" is deleted. The money statements follow the gift's size: `family-loss` has a `.small` variant read by `gift-size` (same formula and 0.05 parameter, the donor ask's picker), the gift riding the packet as `amountMinor`, and plain statements serve a gift that reads small to no one. No heavy-gift variant ships: the game's AI never puts its own money into a race (only the player's own gift does, `contributeOwnMoney`), so no played world gives a gift that reads large against a household's year; the four statements written for it are deleted (see the item `words-family-loss-heavy-gift-needs-a-giver`). M5's fit read of the pairs tied each family-loss and concession-call reply to the lines it answers with `after` keys, and 14 keys now follow the bank's `scene-talk.<move>.<slug>` form.

**Time box.** 4 hours for an Opus session.

**Rules.** No new threshold: `raceMargin` is the Journal's own. Replace, never layer: the old lines are deleted. A line nothing backs is deleted, not kept unplayed.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed) in a played world, that a lost race's scenes say the figure once. A close loss answers "How close was it?" as close and a wide one as wide, and no line says close for a wide loss. The pinned test src/director/family-loss-stake-scene.test.ts, src/director/race-margin.ts, src/director/family-stake.ts, src/director/arc-variant.ts, src/director/data/arc-variants.json passes at its two places and names each scene's record id.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/family-loss-stake-scene.test.ts, src/director/race-margin.ts, src/director/family-stake.ts, src/director/arc-variant.ts, src/director/data/arc-variants.json

**Notes.** Filed Nov 15 by hand with its PR. Some households now offer fewer replies (for example no thank-you or blame after "Tell me what happens now."): M5's read found those replies did not answer that line. The middle-margin answer waits on a drawn place that plays one.
