---
id: laws-od-clean-air-no-plan
title: "Owner decision: clean air cost where the state has no plan law"
area: laws
kind: owner-decision
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: owner decision
milestone:
source: "laws-family-clean-air; stopgap SG-WORLD-owner-decision-clean-air-no-plan"
---

**What.** A factory in a county that misses an air standard pays the compliance cost only while the state's clean air plan law is in force. The Clean Air Act requires a plan either way. Keep the state's law as the only cause, or add a smaller federal-plan cost where the state has none?

**Rules.** Owner decisions are flagged, never waited on.

**Done when.** The owner rules; the stopgap row resolves, with a second rate in the parameter table if he wants the federal cost.

**Files.** src/core2/modules/business.ts (`routeCompliance`), src/core2/data/business/parameters.json

**Notes.** Built as "the state's law is the only cause".
