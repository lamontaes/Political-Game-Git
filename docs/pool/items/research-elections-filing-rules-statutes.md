---
id: research-elections-filing-rules-statutes
title: "Research: read the filing deadlines, registration rules and territory ballot orders still estimated"
area: elections
kind: research
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** Three election tables still rest on estimates after the Oct 23 research. In src/core2/data/elections/filing-deadlines.json, four places set the municipal deadline by charter (the rows marked unread) and 38 rows are tagged ESTIMATED from search excerpts (SG-GOV-filing-deadline-estimate). In data/research/elections/filing-requirements.json, 27 statewide-executive and 8 state-legislative rows say 'not specified' for voter registration, so the fallback requires it (SG-GOV-filing-fallbacks). In data/research/elections/ballot-order-2026.json, three territory rows stay estimates because their code text was not reachable from the cloud (SG-GOV-ballot-order-estimates). Read each rule from the constitution, the code or an official election office page; for each charter place, sample several municipal codes and record their median as ESTIMATED; clear each flag the text settles.

**Cause.** Found in code: SG-GOV-filing-deadline-estimate and SG-GOV-filing-fallbacks are still registered in src/core2/modules/elections.ts (`api.stopgap("SG-GOV-filing-deadline-estimate")` at line 653 and `api.stopgap("SG-GOV-filing-fallbacks")` at line 443) and SG-GOV-ballot-order-estimates in src/core2/modules/voting.ts (line 1070); 38 deadline rows are ESTIMATED in src/core2/data/elections/filing-deadlines.json.

**Fix.** Read each unread or ESTIMATED deadline and each 'not specified' registration row from its statute or office page with section and URL, or keep it with a reason; narrow the three stopgap rows to what is still unread.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: each rule is read from statute text or an official office page, quoted with its section and URL, and a row the text does not settle stays an estimate with its reason written. One rule, all 56 places: rules live in the data tables keyed by place, never a state named in code.

**Done when.** A second session opens src/core2/data/elections/filing-deadlines.json, data/research/elections/filing-requirements.json and data/research/elections/ballot-order-2026.json and finds every unread or ESTIMATED deadline row and every 'not specified' registration row read from its law with section and URL, or kept with a written reason. src/core2/elections-law.test.ts passes in a drawn place (seed named), and a buildBenchWorld year in that place names the town's contest and the filing deadline read from its row. The real rule is reported, not a pass mark.

**Waits on.** Nothing.

**Files.** src/core2/data/elections/filing-deadlines.json, data/research/elections/filing-requirements.json, data/research/elections/ballot-order-2026.json, src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/elections-law.test.ts

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would read the 38 estimated filing deadlines and the territory ballot orders from statutes; the estimates already work, and a number may stay an estimate.
