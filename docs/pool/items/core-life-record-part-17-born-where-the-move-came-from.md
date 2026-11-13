---
id: core-life-record-part-17-born-where-the-move-came-from
title: "The life record, part 17: a person brought to the county is born where their move came from, never in the town they moved to"
area: people
kind: fix
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: opus-lr
pr: #8987
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: Fable A's read of #8957's cards, Nov 13, 2026, filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
---

**What.** A card can say "I was born in Angoon, Alaska in 2007." and then "In 2008, I moved to Angoon, Alaska." (Fable A, Nov 13, Angoon AK seed lrcard03; the same in Cayuse OR seed lrcard01 and Diamondville WY seed lrcard04). The owner, Nov 8: "None of my history is simulated." Seen: a person's card, whose birthplace and moves agree.

**Cause.** Found in code: `src/core2/opening-people.ts` line 67 gives every person the birthplace fact `input.birthplaceJurisdictionId ?? input.homeJurisdictionId`, and no caller passes a birthplace, so it always names the town they live in now (0 of 476 residents born elsewhere in Portsmouth NH, Selma NC and Woodlawn KY, seeds lrborn01 to 03). The moves pass (`originOf`, `src/core2/past-moves.ts` line 50) brings a person to the county when a living parent lives elsewhere, and the run's birth record places their birth there (`residenceOn`); the card (`src/bench/card.ts`) read the opening's fact instead. Every moved-in resident in those towns was told as born in the town it then says they moved to (2 of 2 and 5 of 5).

**Fix.** The card tells the birthplace as where the person lived the day they were born (`residenceOn`), the place their move came from, by its name or its state's; the opening's fact only when no move says otherwise. Register the opening's default (`SG-HIST-birthplace-is-home`).

**Time box.** 2 hours, Opus.

**Rules.** One engine: the moves pass decides where someone came from; the card reads it. Estimate, never UNKNOWN: a place the world keeps at its state's level is said by the state.

**Done when.** A test draws places until one has a resident who moved in, and checks that every such resident's card does not say they were born in the town, and that their residence on their birth date is where the move came from. A second session opens a card on main of someone who moved to the town and sees a birthplace that is not the town.

**Waits on.** Nothing.

**Files.** src/bench/card.ts, src/core2/opening-people.ts, src/core2/data/stopgaps/hist.json
