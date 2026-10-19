---
id: words-budget-hearing-speakers
title: "The budget hearing has speakers and the English engine words the proposal, hearing and vote"
area: words
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The budget season (PR #5217) records a proposal, a public hearing and a vote as events with facts only. The hearing has no speakers, and the proposal, hearing and vote have no English-engine words. Give the hearing the town's speakers on the lines proposed, and have the English engine word the proposal, the hearing and the vote for the journal and the news.

**Rules.** No hand-written player text: words come from the English engine. An effect is a read, not a record: the director reads the budget-proposed, budget-hearing and legislative-vote records. No dice: who speaks follows their stakes in the lines and their traits.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place with a voting council, seed named in the PR body), the budget-hearing record id lists speakers who have a stake in a proposed line, and the journal or the news carries a line for the proposal, the hearing and the vote, each citing its record id; a test in src/director covers it.

**Files.** src/core2/modules/legislature.ts, src/director/journal.ts, data/english/

**Notes.** Follow-up from office-the-budget-season (PR #5217). Words line: the Words session builds it.
