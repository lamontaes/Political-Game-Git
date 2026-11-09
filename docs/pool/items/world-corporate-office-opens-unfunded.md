---
id: world-corporate-office-opens-unfunded
title: "A corporate office opens with no cash and no customers, so its staff are never paid"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Boulevard, California (key 0607694, seed pp-a, npx tsx scripts/money/pay-shortfall.ts pp-a 1 0607694): organization_cd524c66abde5ef1 San Diego County Business Services (enterprise:corporate-office, kind employer) opens with liquidMinor 0 and no customer; work-relationship_9f0d2babaf670fc8 (earned 347,556) and work-relationship_00dcb5339fc58315 (earned 315,832) are paid nothing in a year. Same cause as world-community-nonprofit-opens-unfunded: the class has no business kind, so the opening gives it zero cash (opening-capital.ts unsupportedOpening) and no household or firm buys from it.

**Rules.** Wire to the world: its money comes from a customer on the journal (firms and public bodies buying headquarters services), read by the engine that runs payday; no invented refill. One rule for all 56 places. One model, two tiers.

**Done when.** At two drawn places and seeds named in the PR body, pay-shortfall lists no corporate office paid nothing, and one paycheck is followed to its payer by record id.

**Files.** src/core2/opening-capital.ts, src/core2/opening-customers.ts, src/core2/data/opening-customers.json

**Notes.** Found by Jobs Nov 9 while fixing the nonprofit class (PR jobs/nonprofit-funding). Candidate route: business procurement of corporate-office services by the town's firms (publicPurchases / firm procurement), sized from the CBP payroll the office carries.

**Coordinator ruling (Nov 9, 04:58):** a corporate office's revenue is its parent firm's allocation, by records (the affiliates it serves pay it a share of their costs, read from the books).
**Also in this seed (Boulevard CA, pp-a, one year):** the state government jobs paid nothing sit at organization:treasury:US-CA (cash 580,590,313,542), job ids job:public:state:<department>:<person>, for example job:public:state:general-services:person_2d70ae89a78d4083, job:public:state:health:person_ea11c0fc47fdb814, job:public:state:revenue:person_af98d05612d2a898 (110,389 earned each, 0 paid). The payer has the cash, so the cause is a budget line or payroll calendar; Money has them.
