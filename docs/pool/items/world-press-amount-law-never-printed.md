---
id: world-press-amount-law-never-printed
title: "A change to a law's amount (the minimum wage, a tax rate) never makes the paper: the desk gives it no reader care"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/press-amount-law
pr: #6247
blocked-on:
source: "found by the words-and-scenes lead, Oct 27, building words-live-news-worded (the owner's Oct 26 playtest: Ohio's minimum wage went from $10.70 to $7.25 with no news)"
lead: effects
milestone: play-first
claimed-at: 2026-10-27T05:52:15.616Z
---

**What.** In Stockport, Ohio (seed `ohio-a`, place drawn from Ohio's localities), HB 2 ends the state's minimum wage on April 27–28, 2025: the wage in force falls from $10.70 to $7.25. On January 1, 2026 the state's scheduled $11.00 takes effect. Both records are public and both reach the press wire at state level. In a year of play no outlet prints either one. The desk (`runDesk` in `src/core2/press-desk.ts`) ranks items by proximity, reader care, people involved and renown. An amount law's topic is its series (`minimum-wage`), which is not a policy topic, so its reader care is 0. Every state law involves every follower about equally, so a wage change always loses to a policy law that week. The change's size (a third of every low-wage worker's floor) counts for nothing.

**Rules.** No dice: whether the press prints the change comes from causes the desk already weighs (the readers it reaches and how much the change moves them), not from a chance. Wire to the world: the printed story is read by the news engine, which delivers it to followers, and by News (`words-live-news-worded` words it). One rule, all 56 places: the reading applies to every amount law (wages, tax rates), never a named state.

**Done when.** In a played world (buildBenchWorld) in a drawn Ohio place run to January 2, 2026, at least one outlet prints the January 1 minimum wage change, and the printed story's record id and its pick reasons are named in the PR body. A test in src/core2 covers it, and `npm run speed:year` stays within 20% of base.

**Time box.** 3 hours.

**You will see.** When the minimum wage changes, the town's paper or station runs it, and News shows "Ohio minimum wage rises to $11.00" with the old and new amounts.

**Screenshot.** News after the change, from a drawn Ohio place, in the PR body.

**Files.** src/core2/press-desk.ts, src/core2/press-topics.ts

**Notes.** One candidate cause to weigh: give an amount law the reader care of the policy question that sets the same law (the minimum wage and `raise-minimum-wage`, through `src/core2/question-wages.ts`), and size "people" by the workers the law-reach records name as paid under the new floor. The wording side is built: `src/bench/printed-words.test.ts` words Ohio's change ("Ohio minimum wage rises to $11.00 / The minimum wage in Ohio went from $10.70 to $11.00 on January 1, 2026.") once a story exists.
