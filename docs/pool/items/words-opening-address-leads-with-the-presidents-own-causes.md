---
id: words-opening-address-leads-with-the-presidents-own-causes
title: "The President's address opens on that President's own causes, so two worlds with the same party in office hear different first points"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: gov-federal-questions-have-a-measured-left-right-direction
blocked-on:
lead: words
model: opus
effort: medium
root: rc4-hand-written-words
source: lead, Nov 11, 2026, from the Federal views builder's 14 drawn places (the crew's issue, 07:39 UTC) and W2's read of the address's filter (07:38 UTC)
checked:
claimed-at:
branch:
---

**What.** Once the President holds a view on national questions, every new world's address opens on the same three points in the same order (in 14 drawn places: a ban on stock trading by members of Congress, paying for a higher debt limit, then tariffs). The President in each world is a different person with different causes, and the address does not show it. Seen: the President's address on the first day of three new lives, and the first evening's talk about it.

**Cause.** Found in code: in src/director/opening-story.ts, `wantedOf` orders the questions the President wants by `signature` first, then by `stance`, then by the question's id in the alphabet; `opposedOf` orders the ones he opposes by `stance` and the alphabet only, so a cause he holds against something never leads. `ownStance` (src/core2/officials-roster.ts) clamps the lean at the electorate's ends, and most Presidents sit at the clamp, so every President of one party holds the same stance on each question and the alphabet breaks the tie. `planAddress` then keeps only stands whose law is not in force. Measured by the Federal views builder on its branch: 14 of 14 drawn places, the same first three points.

**Fix.**

1. **His own causes lead, on either side.** In `opposedOf`, order by `signature` first, as `wantedOf` does. In `planAddress`, the point the address turns to Congress with first is the President's first signature question among his stands, wanted or opposed; the wanted and opposed blocks keep their own wordings.
2. **The tie is broken by the person, never the alphabet.** After `signature` and `stance`, order by how far the President's home state's own law on the question differs from the federal law (a state that already does it gives him a reason to ask the country to; read with `lawOn` for his home state from `PRESIDENT_FACT.homeState`), then by the question's place in data/research/laws/starting-law-2026/question-order.json. Remove `localeCompare` from both functions.
3. **Say why in the sentence where a wording allows it.** The stand's facts gain `own-cause` when the question is a signature and `home-state-law` when his home state already has the law, each citing its record, so a core can say "we did this in {home-state}". Add no new wordings in this item unless a block would otherwise have none for the new fact; list the lines needed for a Words builder.
4. **Tests, on drawn places.** In src/director/opening-story.test.ts: across ten drawn places, the addresses open on at least four different first points; a President whose signature question is one he opposes opens on it; and two Presidents of one party with different signature questions open on different points. No test names a place or a question.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the order comes from the President's own record, his home state's law and the catalog's order. One rule, all 56 places. Ask why: the address cites the signature record and the home state's law row. No hand-written player text in code.

**Done when.** A second session, in the running game on main at 1440x900, starts three new lives in drawn places it writes down with their seeds, and reads the President's address in each. The three do not all open on the same point, and for each it opens the President's card and finds the opening point among that President's own causes or his home state's laws.

**Waits on.** PR 8743 (the address's wording) landing, so one writer is in src/director/opening-story.ts at a time.

**Files.** src/director/opening-story.ts, src/director/opening-story.test.ts, src/director/opening-facts.ts, src/core2/officials-roster.ts, data/research/laws/starting-law-2026/question-order.json

**Notes.** The year cannot make worlds differ: every new world shares the country's history at the start, so the year's hardest subject is the same everywhere (W2, Nov 11). All 14 drawn worlds seated a Republican President, which matches the real 2024 result and is not treated as a defect here.
