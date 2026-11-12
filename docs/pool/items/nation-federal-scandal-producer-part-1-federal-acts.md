---
id: nation-federal-scandal-producer-part-1-federal-acts
title: "A cabinet or congress member commits a recorded act through the corruption engine"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: medium
root: design-story-director
source: split from nation-federal-scandal-producer in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Nothing produces a federal-level scandal: the corruption engine records bribes only between the town's own people and officials. Let an official of the President's cabinet or of Congress (people-pack officials; the cabinet the unplayed President fills in president-acts.ts) act as an offered or taken party through the same engine, by their traits, money and chances, never a monthly chance. This is part 1 of nation-federal-scandal-producer. Feeds: nation-federal-scandal-producer.

**Cause.** Found in code: `decide`, `partiesOf` and `pressure` in src/core2/modules/corruption.ts work from the town's people, and the cabinet is built by `cabinetOf` in src/core2/modules/president-acts.ts; no federal official is ever a party to a crime record.

**Fix.** Make a seated cabinet member or member of Congress an eligible party in the corruption engine (no second scandal system), writing the same crime record with the official's id, so later parts can read it.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the act follows the official's traits, money and chances, never a monthly chance. One engine: the corruption engine's records, not a second scandal system. One model, two tiers: a full federal official is decided by the same rule as a town one.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose and sees a cabinet or congress member party to a recorded act in the corruption engine's crimes table, by record id, with the traits and money that decided it; src/core2/federal-scandal.test.ts (new) names the place, seed and record ids.

**Waits on.** Nothing.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/president-acts.ts, src/core2/federal-scandal.test.ts (new)
