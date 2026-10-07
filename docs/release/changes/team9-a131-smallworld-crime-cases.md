---
id: team9-a131-smallworld-crime-cases
impact: patch
section: Fixed
title: Crime integration fixtures retain real clocks in smaller worlds
---

The long crime integration cases use the existing small-world and starting-condition writers rather than full playable-life openings. The feed fixture adds a canonical second locality and actual households through existing writers. Incident, journal, knowledge, police, referral, charge, and foreign-town exclusion assertions remain. The positive-fear fixture now joins an actual saved report on its occurrence day to the returned fear source ID, under CTO 10:54; it no longer asserts every year has excess crime. The prior zero-fear yearly failure is preserved. Exposure days stop at the requested window before constructing a date far beyond it; focused tests cover tiny positive rates and replay boundaries.
