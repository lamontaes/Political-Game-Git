---
id: elections-challengers-term-keeps-races-uncontested
title: "Local races stay 85 to 92 percent uncontested at any stay-out pull from 3.8 to 4.0: find the term that keeps challengers out"
area: elections
kind: bug
priority: 3
size: M
status: claimed
claimed-by: claude/challengers-term
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T18:59:22.078Z
---

**What.** Measured Oct 20 (played towns, 400 days, local seats with closed filing): 85.0 percent of 107 seats uncontested with candidacyStayOutPull at 3.8, 91.7 percent of 132 at 3.9, 85 percent of 111 at 4.0, against Ballotpedia's 58 to 75 percent. The pull is therefore not the lever inside its documented spread. Read the chooser's reasons for the adults who could challenge an incumbent in a local seat (src/core2/modules/candidacy.ts, the incumbency weight at 3.5, ambition and the party terms) and find which term keeps challengers out, then change that term within its spread and re-measure.

**Rules.** No dice: terms change the pull, never a roll. Research before building: Ballotpedia's counts are the check. One rule, all 56 places. Wire to the world: re-measure in buildBenchWorld places drawn at random with seeds named.

**Done when.** The pooled uncontested share over at least 100 local seats in places drawn at random (seeds named in the PR body) has its centre within 8 points of 70 percent; who-runs.test.ts passes; the parameter citation records the measurement.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json

**Notes.** TODO
