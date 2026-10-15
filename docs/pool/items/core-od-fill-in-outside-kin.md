---
id: core-od-fill-in-outside-kin
title: "Owner decision: A counted person built at fill-in has their household, job and coworkers but no relatives living outside their"
area: core
kind: owner-decision
priority: 2
status: done
claimed-by:
pr:
blocked-on:
milestone:
source: "stopgap SG-CORE-owner-decision-fill-in-outside-kin"
---

**What.** Question for the owner: The owner's ruling; if wanted, the opening's relative generator run for one filled-in household, seeded by the world.

**Rules.** Look before you ask: quote DECISION-REGISTER.md and OWNER-DECISIONS.md first. Build the simplest version meanwhile.

**Done when.** The owner rules; the stopgap row resolves.

**Files.** src/core2/state.ts

**Notes.** BUILT. fillInPerson (src/core2/state.ts) rebuilds the filled-in household's past with buildDeepPast (past-family.ts); relatives living elsewhere are husks, filled in when met. Merged with the world-has-a-past work.
