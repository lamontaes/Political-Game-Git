---
id: laws-outcome-labor-cannabis
title: "Public-sector bargaining and cannabis sales laws reach workers, retailers and buyers as a read"
area: laws
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-b6g0dl
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:54:38.432Z
---

**What.** Public-sector collective bargaining and legal cannabis sales are group A policies with mechanic none, so they are records that no engine reads. Bargaining needs a union contract that sets a unit's pay with its employer (see gov-public-sector-bargaining), and cannabis needs a licensed-retail market that buyers and retailers join and that the sales tax collects on (see laws-cannabis-sales-tax). Build those two readers first, then this item only proves the chain from each law to a worker and a retailer.

**Rules.** An effect is a read: another engine must read the law when it decides or pays, not a record beside it. No dice: outcomes follow traits, money and the law in force. The chain is the acceptance: law, record, payment or decision, person, view, journal line.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a public worker's pay record id changes through a contract after the bargaining law passes, and a retailer's sale receipt id carries cannabis tax after the sales law passes, proven by a test in src/core2/law-reach-group-a.test.ts.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a-union.ts, src/core2/law-reach/group-a.ts

**Notes.** Examined Oct 19 by the Medicaid session (PR #5179): waits on gov-public-sector-bargaining and laws-cannabis-sales-tax. Stopgaps SG-GOV-REACH-A-bargaining and SG-GOV-REACH-A-cannabis-market name what is faked.
