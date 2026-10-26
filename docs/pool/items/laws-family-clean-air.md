---
id: laws-family-clean-air
title: "Clean air plan: the business compliance cost cites the law, and the generic record goes"
area: laws
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4438
blocked-on:
milestone:
source: "split of laws-remaining-families (Oct 15)"
---

**What.** The business engine already charges manufacturers and quarries a compliance share in an EPA nonattainment county (`routeCompliance`, business.ts). The clean-air-plan law also writes generic employer rows beside it. Decide what the state plan changes (the cost is federal either way), make the engine cite the law row when it is in force, and remove the duplicate rows.

**Rules.** An effect is a read; replace, never layer; no new mechanic because real life has it. If the law changes nothing the engine did not already do, say so in the PR body as a question for the owner.

**Done when.** The generic employer rows for this law are gone, and a played year in a county with a nonattainment designation shows the compliance payment on the journal citing the law row (or the PR records the owner question).

**Files.** src/core2/modules/business.ts, src/core2/law-reach/group-b.ts, src/core2/data/laws/reach-group-b.json.

**Notes.** Stopgap SG-GOV-REACH-B-nonattainment-data.
