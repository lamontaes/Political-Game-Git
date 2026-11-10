---
id: core-fast-clock-part-8-design-the-town-as-counts-in-a-skip
title: "The fast clock, part 8: the design that takes a skipped year from tens of seconds to under one"
area: core
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: fable
model: fable
effort: high
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** The country tier steps every state for a month in a few milliseconds because a state is a few dozen cells. The town's own monthly engines work record by record, so a skipped year stays at seconds, not hundredths. Reaching twenty years in about five seconds needs the town itself kept as the tier's kind of cells during a skip, with only the player's household and circle kept as people, and rebuilt on return. That design does not exist yet.

**Cause.** Needs cause. Looked at: the calendar-only year in Chumuckla, Florida (14.6 seconds, mostly the engines' own monthly work on counted records plus about 820 state and federal officials kept as people); the tier's month in src/core2/country-model.ts; docs/design/country-tier.md point 7, which says the town runs as results in a skip and does not say how its records become cells and come back. Not yet known: which of the town's records can be summed into cells and rebuilt without changing what a player later sees, and what part 7's table shows once parts 1 to 4 are in.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Fable-level session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** This is a design, written for the owner in plain words and added to docs/design/country-tier.md before anything is built. One model, two tiers. The life record keeps writing in a skip (CTO, Nov 10). It must say what a player can and cannot see differ after a skip, and each build step it proposes becomes a pool item at the standard that Opus or Sonnet can build from the item alone.

**Done when.** A second session reads the design section and the pool items filed from it and confirms each item names its cause in code, its fix and what a second session will see; then, once those are built, presses the 20 years control on main in a drawn place and reads a time under ten seconds.

**Waits on.** core-fast-clock-part-7-what-a-skipped-year-still-costs.

**Files.** docs/design/country-tier.md, src/core2/country-model.ts, src/core2/life.ts

**Notes (Fable, Nov 10, measured, and a candidate design that is not tested).** Measured on main at e67bee1c63 in South Fork, Missouri (place key 2968762, world seed a499835260b786a6f03656c7b468096d095bdd4534cd0d04275bc3186d34d28f): one year of only the engines' dated work takes 19.7 seconds, and no engine stands out. The housing review costs 2.4 seconds, the country's month 2.1, the press week 1.8, the council's meetings 1.5, other governments' sessions and floor weeks 3.3, the jobs review 1.4, and nine more cost between 0.4 and 0.8 each. Part 1 (pull request 8171) measured 6 to 7 seconds a skipped year in three smaller places. So cutting any one engine does not reach seconds, and stepping every engine by the month has a floor of several seconds a year. An inventory of the engines (83 modules: 39 book dated work, 50 have a daily loop; several keep work indexed by exact date, and the monthly ones book their next run from today's date with no catch-up) shows why a plain jump in the date breaks them.

The candidate design, in three steps. Before a skip, everyone but the player's household and circle goes back to the counts, and the household and circle are run the way relatives who live elsewhere already are (skill `lives`), so their lives keep being written. During the skip only the country tier steps, with the played town as one more unit of it (part 4 of the town joining its state gives the town's sums), and each election date in the window is counted from the voters. On return, each engine that holds running state (residents, accounts, jobs, housing, businesses, credit, coverage, budgets, offices) is brought to the town's new sums once, its due dates are set forward, and the engines that only keep a schedule are opened again at the new date. The cost would then depend on the number of engines, not on the number of years.

What is not known, and why this stays needs cause: whether the stateful engines can be brought to new sums without breaking the money journal's balance or a lease, loan or term in flight; how many engines are in each group (the inventory has to be sorted engine by engine); and what part 7 measures once parts 2 to 4 are in. The next step is a trial on one engine that holds money (residents) and one that holds dated contracts (housing), in a drawn place, before any item is filed from this.
