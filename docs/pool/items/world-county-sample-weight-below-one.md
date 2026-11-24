---
id: world-county-sample-weight-below-one
title: "A county's sampled households can each stand for a small fraction of a household"
area: world
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-world-county-sample-weight-below-one
pr: #8682
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: found Nov 10 by Fable while finding the cause of world-counted-departure-insufficient-group-funds
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:07:09.320Z
merged-at: 2026-11-12T22:59:11.545Z
---

**What.** Every counted record is read as standing for at least one real household. Filling one in makes one whole household with one household's cash, and a departure removes it. In a town that is most of its county, the county's sample records each stand for a few thousandths of a household. A player who clicks one of those county people gets a whole household made from almost nothing, and the group's money and people stop adding up. Seen: clicking a county person, who is made from almost nothing, and the group's money.

**Cause.** Found in code: `withCountySample` in src/core2/opening-county-sample.ts (line 288) sets the sample's weight to the county's eligible voters, less the relatives already placed there, over the sample's own eligible adults, with a floor of one voter for the whole sample. Nothing keeps the weight at or above one. Measured in Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96): 3,717 eligible voters, 3,817 adult relatives placed in the county, 241 sample adults, weight 0.00417.

**Fix.** In `withCountySample`, when the weight would come out below one, cut the sample to the households that fit at a weight of one, in the sample's own order, and drop the employment rows and owners of the households cut. When none fit, add no sample and return the input unchanged. Add a test in src/core2/opening-county-sample.test.ts that builds the Larned opening and reads every county record's weight at one or more, and a second place where the weight is above one and the sample is unchanged from main.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted record is read by every engine as a whole number of households or more, never a fraction. One rule, all 56 places: the cut follows the county's own counts, with no place named in code. No dice. Wire to the world: show the county's counted people before and after in the named place.

**Done when.** A second session (not the builder) opens the named place, Larned, Kansas, on main and reads in dev mode's Records that no county household record carries a weight below one. In a drawn place, from a seed nobody chose, it clicks a person of the county and sees the household filled in with cash no larger than its group held.

**Waits on.** Nothing.

**Files.** src/core2/opening-county-sample.ts, src/core2/opening-county-sample.test.ts
