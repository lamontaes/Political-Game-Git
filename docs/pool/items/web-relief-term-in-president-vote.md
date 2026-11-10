---
id: web-relief-term-in-president-vote
title: "A town that received disaster relief credits the president's party when it votes"
area: elections
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "stand-in triage of the web register, Nov 10 (docs/stopgaps/triage-2026-11-10/web.md)"
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
---

**What.** The disasters engine already pays FEMA public and housing assistance into the town's books, and the research sizes how much relief per person moves the president's party's vote, but no voting rule reads the relief (SG-WEB-voting-relief-approval).

**Cause.** Found in code: src/core2/turnout-web.ts line 97 (the marker comment); `candidateReasons` in src/core2/electorate-inputs.ts (line 149) has terms for the economy, the midterm and local standing but none for relief. The payments are the cash-journal transfers with reason `federal.disaster-public-assistance` written in src/core2/modules/disasters.ts (around line 520).

**Fix.** Add a relief term for the president's party in `candidateReasons`: .454 points of vote share per unit of ln(1 + relief per person in 2008 dollars) (Healy and Malhotra 2009, Table 5, column 2), the relief read from the disasters module's recorded payments per resident of the voter's place (the FEMA assistance rows `src/core2/modules/disasters.ts` already pays through the obligations path with reason `federal.disaster-public-assistance`; read those, add no second relief ledger), put in 2008 dollars with the same price index the repository already uses for such conversions, and counted only when the town has heard of the relief (a news fact, so it is not a read of something nobody knew). Add a row to the effect matrix and remove the link from src/core2/data/outcome-web/unwired.json by regenerating it.

**Time box.** 6 hours.

**Rules.** An effect is a read, not a record. No dice. Ask why: the voter's reason cites the relief and the news source. Applies to counted voters with the same rule.

**Done when.** A second session plays a drawn place and seed it chose (named) through a declared disaster and the next presidential or midterm election, and sees the relief dollars, the story the town heard, and the president's party's vote share higher than in the same world with no relief paid, by record id.

**Waits on.** Nothing.

**Files.** src/core2/electorate-inputs.ts, src/core2/turnout-web.ts, src/core2/modules/disasters.ts, src/core2/data/outcome-web/unwired.json, src/core2/data/stopgaps/web.json
