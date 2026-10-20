---
id: elections-ballot-order-statutes
title: "The 20 estimated ballot-order rules are checked against each state's or territory's statute text"
area: elections
kind: research
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5621
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** For 20 of the 56 places the ballot-order rule in data/research/elections/ballot-order-2026.json was read from Ballotpedia only or assumed (SG-GOV-ballot-order-estimates): five territories and fifteen states, mostly the primary rule or the order within a party. Read each place's statute from an official or code-publishing site, correct the rule where the text says otherwise, cite the section and URL, and clear the estimate flag on each row the text settles. A row the text does not settle stays an estimate with the reason written.

**Rules.** Research before building: the statute decides the rule and nothing else does; an unsettled row stays marked ESTIMATED with its source, never UNKNOWN. One rule, all 56 places: the rules are rows in data keyed by state key, never a state named in logic. Replace, never layer: a corrected row replaces its old value in the same file.

**Done when.** Every row that had estimate true is either checked against statute text with its section and URL recorded and estimate false, or still true with the reason; SG-GOV-ballot-order-estimates is narrowed to the rows still estimated or resolved if none; the voting tests (src/core2/voting.test.ts) pass in a drawn place, seed named in the PR body.

**Files.** data/research/elections/ballot-order-2026.json, src/core2/modules/voting.ts, src/core2/data/stopgaps.json

**Notes.** Split from research-elections-sourced-parameters on Oct 20; state code sites such as law.lis.virginia.gov were reachable from the cloud container, so the statutes can be read.

Sent back 2026-10-20 from PR #5621 (branch claude/ballot-order-statutes): session and date notes (container fetch failures, 'searched Oct 20') in ballot-order-2026.json must not ship; finish on that branch, merge main into it first.
