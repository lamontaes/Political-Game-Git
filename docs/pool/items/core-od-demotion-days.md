---
id: core-od-demotion-days
title: "Owner decision: A full person out of the player's life for 180 days returns to their counted group (TUNABLE)."
area: core
kind: owner-decision
priority: 2
status: done
claimed-by:
pr:
blocked-on:
milestone:
source: "stopgap SG-CORE-owner-decision-demotion-days"
---

**What.** Question for the owner: The owner's number of days.

**Rules.** Look before you ask: quote DECISION-REGISTER.md and OWNER-DECISIONS.md first. Build the simplest version meanwhile.

**Done when.** The owner rules; the stopgap row resolves.

**Files.** src/core2/data/counted/parameters.json

**Notes.** Owner ruling, Oct 15, 2026: 'The days without contact before a met person drifts back into the counted population is a per-world range of 180 to 240 days, drawn once per world at generation (seeded generation is allowed), never a single fixed number.' Built: demotionDays in src/core2/modules/counted-demotion.ts.
