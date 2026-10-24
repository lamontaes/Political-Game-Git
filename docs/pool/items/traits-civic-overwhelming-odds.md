---
id: traits-civic-overwhelming-odds
title: "Believing a heard story, going to party meetings and joining a group vary with circumstances, not only temperament"
area: people
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/traits-civic
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T16:12:50.417Z
---

**What.** Three civic decisions with no study run at the general trait weight of 1 against a case that barely varies, so temperament alone settles them. In Ora, Indiana's played year the most suspicious hearers doubted every claim while everyone else believed every claim, the least willing third went to party meetings 2 percent of the time against 75 percent for the most willing, and group joining split 0.2 against 25 percent. Give each case its own recorded circumstances (the teller's trust and closeness and the claim's fit with the hearer's views; the member's distance and free time; the group's stake in the hearer), then calibrate each weight to the single-decision range the research file reports (1.1 to 1.3 per standard deviation) unless a study gives a size.

**Rules.** No dice: the case is each person's recorded circumstances, never a roll. Sliding scales: nobody should doubt every claim at a fixed trait bar; the case must slide so a doubter still believes a trusted friend. Research before building: weights cite a study or the single-decision range with a gap row.

**Done when.** scripts/traits/trait-wiring-audit.ts played, flat and mirror twins and trait-wiring-matrix.ts on one year of buildBenchWorld in two places drawn from all 56, seeds named, show conversation.believe-claim, parties.attend and interest-groups.member-join with formula thirds net odds ratios between 1.2 and 3, and a test names one doubter who believed a trusted teller by record id.

**Files.** src/core2/heard-claims.ts, src/core2/modules/parties.ts, src/core2/modules/interest-groups.ts, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 24 by the traits lead from the civic family's twin audit (Ora, Indiana, place key 1856700, seed 66c0262471b0): net odds ratios between the thirds were 2,918 (believe-claim), 182 (parties.attend) and 309 (member-join). The traits-wire-civic PR keeps them at the general weight with gap rows.
