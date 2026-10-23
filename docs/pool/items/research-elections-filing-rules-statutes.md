---
id: research-elections-filing-rules-statutes
title: "Research: read the filing deadlines, registration rules and territory ballot orders still estimated"
area: elections
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three election tables still rest on estimates after the Oct 23 research. In src/core2/data/elections/filing-deadlines.json, four places set the municipal deadline by charter (the rows marked unread) and 38 rows are tagged ESTIMATED from search excerpts (SG-GOV-filing-deadline-estimate). In data/research/elections/filing-requirements.json, 27 statewide-executive and 8 state-legislative rows say 'not specified' for voter registration, so the fallback requires it (SG-GOV-filing-fallbacks). In data/research/elections/ballot-order-2026.json, three territory rows stay estimates because their code text was not reachable from the cloud (SG-GOV-ballot-order-estimates). Read each rule from the constitution, the code or an official election office page; for each charter place, sample several municipal codes and record their median as ESTIMATED; clear each flag the text settles.

**Rules.** Research before building: each rule is read from statute text or an official office page, quoted with its section and URL, and a row the text does not settle stays an estimate with its reason written. One rule, all 56 places: rules live in the data tables keyed by place, never a state named in code.

**Done when.** Every unread or ESTIMATED filing-deadline row and every 'not specified' registration row is read from its law with section and URL, or kept with a reason; scripts/research/elections-sources-check.ts passes with the stopgap counts narrowed; src/core2/elections-law.test.ts passes in a drawn place, seed named; and a buildBenchWorld year names the town's contest and the deadline read from its row.

**Files.** src/core2/data/elections/filing-deadlines.json, data/research/elections/filing-requirements.json, data/research/elections/ballot-order-2026.json

**Notes.** TODO
