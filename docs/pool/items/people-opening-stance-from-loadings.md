---
id: people-opening-stance-from-loadings
title: "A person's opening stance on a question reads the survey loadings for their faith and education, not the lean axis alone"
area: people
kind: wiring
priority: 3
size: M
status: in-pr
claimed-by: claude/stance-from-loadings
pr: #5495
blocked-on:
after: research-opening-stance-loadings
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:06:05.232Z
---

**What.** viewOn is lean times a question's axis plus what the person has heard. data/research/people/opening-stance-loadings.json (CES 2020, PR 5489) gives, for eight policy questions, how faith, a four-year degree and lean move the stance with intervals. Make the opening stance on those questions add the faith and degree loadings (people need a faith and an education record, or a stand-in registered as a stopgap), and leave the other 46 questions on the lean axis alone, ESTIMATED.

**Rules.** An effect is a read: viewOn must read the loading at the moment a person's view is formed. No dice: the loading moves the stance on a sliding scale; real survey rates check totals and never pick one person's stance. Estimate, never UNKNOWN: a question with no survey item has zero loading, marked ESTIMATED. One rule, all 56 places.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named) a churchgoing person and a non-churchgoing person with the same lean hold different opening stances on restrict-abortion by the loading, shown by record id; the parameter rows cite the research file and its interval; the stance mean across the town still matches the lean axis within the survey's spread.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/data/parameters.json, data/research/people/opening-stance-loadings.json

**Notes.** TODO
