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
---

**What.** The country tier steps every state for a month in a few milliseconds because a state is a few dozen cells. The town's own monthly engines work record by record, so a skipped year stays at seconds, not hundredths. Reaching twenty years in about five seconds needs the town itself kept as the tier's kind of cells during a skip, with only the player's household and circle kept as people, and rebuilt on return. That design does not exist yet.

**Cause.** Needs cause. Looked at: the calendar-only year in Chumuckla, Florida (14.6 seconds, mostly the engines' own monthly work on counted records plus about 820 state and federal officials kept as people); the tier's month in src/core2/country-model.ts; docs/design/country-tier.md point 7, which says the town runs as results in a skip and does not say how its records become cells and come back. Not yet known: which of the town's records can be summed into cells and rebuilt without changing what a player later sees, and what part 7's table shows once parts 1 to 4 are in.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Fable-level session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** This is a design, written for the owner in plain words and added to docs/design/country-tier.md before anything is built. One model, two tiers. The life record keeps writing in a skip (CTO, Nov 10). It must say what a player can and cannot see differ after a skip, and each build step it proposes becomes a pool item at the standard that Opus or Sonnet can build from the item alone.

**Done when.** A second session reads the design section and the pool items filed from it and confirms each item names its cause in code, its fix and what a second session will see; then, once those are built, presses the 20 years control on main in a drawn place and reads a time under ten seconds.

**Waits on.** core-fast-clock-part-7-what-a-skipped-year-still-costs.

**Files.** docs/design/country-tier.md, src/core2/country-model.ts, src/core2/life.ts
