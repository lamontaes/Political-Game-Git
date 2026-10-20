---
id: world-stopgap-business-generated-identity
title: "Stopgaps in business (generated-identity): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/business.ts, kind generated-identity"
after:
claimed-at:
---

**What.** At the opening, `open` in src/core2/modules/business.ts makes the highest-paid current worker of each business its owner-operator, except the largest businesses by staff (up to the state's share of jobs in multi-establishment firms, from ownership.json) that belong to firms outside the town. Replace the highest-paid rule with an owner chosen from the people's own records: a sliding founder-fit score over the town's residents, using whether the person's occupation matches the business's industry, their age against the class-of-worker self-employment age profile, their liquid wealth against the opening capital the business holds, their tenure and their traits (`decisionLean` for risk and ambition). Record a founding on each business (founder id, a founded date drawn from the firm-age distribution in bds-rates.json, and a past fact so the business has an origin) so the history the opening carries is consistent with who owns it. A business may be owned by a resident who is retired or works elsewhere, and may be run by a hired manager. The self-employed share of the town's workers by industry (ACS class of worker) checks the total. Keep the outside-firm rule, whose parent is the place's outside account. Delete the highest-paid heuristic and the `SG-WORLD-business-opening-owners` marker.

**Rules.** No dice: the owner is the best fit by score from records, with ties broken by id, never a roll; seeded generation of who exists stays allowed, but who owns what follows from the people. Sliding scales and causes: each factor moves the fit a little, with no threshold that makes someone an owner. One model, two tiers: a counted resident can own a business through their group, by the same score times their count. An effect is a read, not a record: the owner row must be read by the pass-through tax, the credit module, the contracts award (`ownerOf`) and closure by choice. The world has a past: the founding date and founder are part of the opening's history, consistent with the person's record. Ask why: the owner choice keeps the factors it scored on.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), each non-outside business has an owner row naming a resident by person record id with the recorded fit reasons and a founding record, at least one owner is not the business's highest-paid worker, the owner's draws and pass-through tax reach their account by journal record id, a public contract award's closeness score reads that owner, the town's self-employed share by industry lands within the ACS spread, and src/core2/business-opening-owners.test.ts proves it; the row is resolved in stopgaps.json.

**Files.** src/core2/modules/business.ts, src/core2/data/business/ownership.json, src/core2/data/business/bds-rates.json, src/core2/data/business/parameters.json, src/core2/business-opening-owners.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: The opening's largest businesses (by staff, up to the state's estimated share of jobs in multi-establishment firms) belong to firms based outside the town; every other is owned by its highest-paid current worker, as owne

Oct 20 (pool feeder): spec written; the replacement named in the row ('owners from the opening's history, M1-14') is exactly this; the outside-firm half already exists. Related: world-business-owner-seam (done) built the owner decisions this reads.
