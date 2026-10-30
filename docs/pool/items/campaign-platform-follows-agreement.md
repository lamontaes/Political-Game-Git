---
id: campaign-platform-follows-agreement
title: "A candidate runs on the questions where the voters agree with them, keeping their positions"
area: elections
kind: feature
priority: 2
size: M
status: claimed
claimed-by: governing/platform-follows-agreement
pr:
blocked-on:
source: governing lead, Oct 30 (measurement: players and rivals run on views the town opposes; research in the PR)
lead: governing
claimed-at: 2026-10-30T09:31:39.320Z
---

**What.** A candidate's platform (candidatePlatform in src/core2/campaign-stances.ts) is the questions they feel most strongly about, whatever the town thinks, so a candidate is known for views most residents oppose and being known costs them votes (Murray, Nebraska, measurement: the player ran on welfare 0.72, natural resources 0.59 and police oversight 0.56 and won 15 votes to 145). Research says real candidates keep their positions but choose which questions to talk about mostly by where they believe voters already agree with them, and stay silent where they are on the losing side (Druckman, Jacobs and Ostermeier 2004, Journal of Politics: plus 10 points of support for the candidate's position gave about 58 percent more space on a domestic issue, coefficient 0.028 to 0.043 depending on the model; Ansolabehere, Snyder and Stewart: positions almost never converge). Build the emphasis rule for every candidate, the player's headless path and world candidates alike.

**Rules.** No dice: a sliding score, conviction times exp(slope times believed support), top N, with the slope ESTIMATED from the Druckman, Jacobs and Ostermeier coefficients within their spread. Positions never change for the platform; only which questions are run on. One model, two tiers: support is read from the voter groups and the people the candidate knows, the counted groups by the same rule times their count; where no engine keeps a candidate's belief about support, the true share is used and registered as a stopgap. Research in the PR body with fetched quotes (the verified synthesis is in the governing lead's scratchpad and goes into docs/research).

**Done when.** In a buildBenchWorld played year in a drawn place with the seed printed, every contested local race's candidates' platforms are their top questions by the rule, read by record (candidate id, question, conviction, support, score), a candidate whose strongest view is the town's minority side leaves it off when another question scores higher, and a calibration total over the year shows emphasis rising with support inside the band the research gives (about plus 27 to plus 86 percent per 10 points).

**Files.** src/core2/campaign-stances.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps.json, docs/research/platform-emphasis-2026-10-30.md

**Notes.** TODO
