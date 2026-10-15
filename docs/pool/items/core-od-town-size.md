---
id: core-od-town-size
title: "Owner decision: A town larger than the opening target (10,000 people, owner decision Oct 9) opens with 10,000 people, not its "
area: core
kind: owner-decision
priority: 2
status: done
claimed-by:
pr:
blocked-on:
milestone:
source: "stopgap SG-CORE-owner-decision-town-size"
---

**What.** Question for the owner: The owner's ruling: either keep the cap, or let each counted group of a bigger town carry its Census count with the money and reach scaled to it.

**Rules.** Look before you ask: quote DECISION-REGISTER.md and OWNER-DECISIONS.md first. Build the simplest version meanwhile.

**Done when.** The owner rules; the stopgap row resolves.

**Files.** src/core2/population.ts

**Notes.** DECIDED. OWNER-DECISIONS.md, 'Town size (day-one audit)': 'a town opens at its real Census size; nothing pads it to 10,000.' Follow-up for the engineers: population.ts still caps a town above its target; make it follow the ruling.
