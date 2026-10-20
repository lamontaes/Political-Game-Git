---
id: world-health-spending-sellers
title: "Insurance carriers and clinics exist as sellers in a generated town so health spending has a payee"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Households have no health insurance or medical services spending because no seller of those kinds exists in the opening economy; the CE categories health insurance and medical services (data/source/consumer-expenditure/raw, rows 460 and 465) are not bound to any firm. Add carriers and clinic sellers to the opening economy from County Business Patterns establishment counts so a household flow to them lands on a real firm's books. Do not add the household flow here; that is the next item.

**Rules.** Wire to the world: the sellers exist in every generated town from records, sized by establishments per resident, one rule for all 56 places. One model, two tiers: counted sellers scale like counted households. Estimate, never UNKNOWN: a place without recorded establishments starts from the national average with a spread.

**Done when.** In buildBenchWorld for a drawn place and a seed the builder did not choose, the opening economy holds insurance and clinic firms whose count follows County Business Patterns, each with books, and the money balances over a one-year run; a test names the place and seed.

**Files.** src/core2/opening-economy.ts, src/core2/data/business-books.json, src/core2/opening-customers.ts

**Notes.** TODO
