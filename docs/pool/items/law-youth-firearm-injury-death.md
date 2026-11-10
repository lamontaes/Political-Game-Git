---
id: law-youth-firearm-injury-death
title: "Young people die of firearm injury in the town through the health engine, so the web's youth firearm rates book a named death"
area: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: stand-in triage, Nov 10
claimed-at:
after:
lead: laws-effects
model: opus
effort: medium
root: design-one-model-two-tiers
---

**What.** The child-access-prevention and handgun-age laws move the web's youth firearm death and suicide rates, and the public-safety engine turns those rates into an expected count of young people lost in the town each month, but no young person dies of it: the count is only recorded as "read". Book the death on a full young person, or on a counted young person's group, through the health engine, so a named teen can die of a firearm injury and the death reaches the family, the paper and the journal. Closes stand-in SG-LAW-justice-youth-firearm-harm.

**Cause.** Found in code: src/core2/public-safety.ts lines 1930 to 1960 compute the expected youth deaths and suicides from `webRate` of health.youth-firearm-deaths and health.youth-firearm-suicide and call `lawApplied` with `what: "youth-firearm-deaths-read"`; counted people die only through the illness-course engine in src/core2/births-counted.ts and nothing books an injury death for a child (stopgap registered in src/core2/data/stopgaps/law.json).

**Fix.** Add a death cause "firearm injury" to the health engine (src/core2/modules/health.ts) that the public-safety month hands the expected count to: for full young people choose who dies from their own home (a firearm in the home is already kept per person as `gunHome`, and the storage law) and their own stress and traits, never a roll; for counted young people, remove the count from the group the way the illness engine does. The death goes through the same death path (estate, notice, journal) as any other. Replace the "read" bookkeeping call; do not add a second death writer. This is a health death, not a crime offense; the crime system's offenders and arrests are not touched.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who dies is decided by the person's home, firearm storage, age and mood, the law in force and the place's conditions; the web's rate checks the total over a year and never picks one teen. One model, two tiers: counted young people die by the same rule times their count. The chain is the acceptance: law, rate, death, family, notice. Look-first: check `docs/design/crime` and the crime-system items before touching offenders; this item does not.

**Done when.** A second session, not the builder, plays a year in a place drawn from all 56 with a seed nobody chose (place and seed named) with and without a child-access-prevention law, and sees a young person's death by firearm injury with its record id, the death notice and journal line, and the yearly count with the law higher or lower than the same world left alone; `youth-firearm-deaths-read` no longer the only trace.

**Waits on.** Nothing.

**Files.** src/core2/public-safety.ts, src/core2/modules/health.ts, src/core2/births-counted.ts, src/core2/data/stopgaps/law.json
