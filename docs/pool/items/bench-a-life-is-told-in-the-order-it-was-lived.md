---
id: bench-a-life-is-told-in-the-order-it-was-lived
title: "A life is told in the order it was lived, on Your life and every card"
area: people
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: opus-lr
pr: #9026
after:
blocked-on:
lead: lives
model: opus
effort: medium
root: design-life-record
source: Fable A, rule 17, Nov 13, 2026, from Playtester P2's batch (Fruitland, Idaho); filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
merged-at: 2026-11-13T07:45:07.984Z
---

**What.** Fable A, Nov 13, rule 17: "A life is told in order everywhere it is told." A card grouped its lines by kind, one paragraph for partners, one for school, one for work, so a life opened on a 2016 separation before 1979's schooling and ended on a 2020 hospital stay after a 1989 arrest (Playtester P2, Fruitland, Idaho). Seen: Your life and every person's card.

**Cause.** Found in code: `lifeStory` in `src/bench/ui/strips.mjs` put each line into the paragraph of its group (`controls.lifeGroups`), so the card's date order was lost.

**Fix.** Keep the card's lines oldest first and start a new paragraph only where the kind of thing changes (`inOrderParagraphs`), so related lines still sit together and no line leaves its year.

**Time box.** 1 hour, Opus.

**Rules.** No new words: the same lines, in a different order.

**Done when.** A test gives the card a life whose kinds alternate and checks the paragraphs keep its order. Three cards, each in a drawn place, tell their story by year, shown before and after. A second session, on main, opens Your life and three cards in a drawn place and sees each story run by year.

**Waits on.** Nothing.

**Files.** src/bench/ui/strips.mjs, src/bench/card-life.test.ts

**Notes.** Built by the Life records builder (opus-lr), Nov 13.
