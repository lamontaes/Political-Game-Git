---
id: world-stopgap-business-books-authored-economic-crosswalk
title: "Stopgaps in business-books (authored-economic-crosswalk): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/business-books.json, kind authored-economic-crosswalk"
after: world-stopgap-business-generated-identity
---

**What.** src/core2/data/business-books.json maps 33 workplace classifications (such as `enterprise:retail`) that an old authored list made up to an industry prior and a funding route, with unknown classifications left as a gap and no legal form. Replace the authored list with a published one: give each opening employer a NAICS sector and subsector code (from the Census NAICS 2022 structure, carried by the opening's employer generation), map NAICS to the IRS Statistics of Income industry groups the priors use, take legal form from the employer's owner record (an owner-operated business is a pass-through, a location of an outside firm is a corporation, a school or church is a nonprofit by NAICS 61 and 813, a department is a government), and take the funding route from that (sales, a treasury through its public pay authority, tuition or donations for a nonprofit). A classification with no mapped row falls back to the all-industry prior, marked ESTIMATED, instead of producing a gap, as the Oct 19 research note recommends. Delete the authored classification list and its stopgap id.

**Rules.** Replace, never layer: the authored classification list is deleted when the NAICS crosswalk replaces it. Estimate, never UNKNOWN: an unmapped class takes the all-industry prior, marked ESTIMATED with its spread, and never leaves a gap. One rule, all 56 places: the crosswalk is a published national table, with no place named. An effect is a read, not a record: the business books, the property-tax and the pass-through engines must read the legal form and funding route. Wire to the world: the legal form decides who pays the profit tax, an owner or the corporation. Numbers in the parameter table are SOURCED with publisher, year and URL.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), every opening employer carries a NAICS code, a legal form and a funding route by organization record id, an owner-run shop is taxed as a pass-through and a corporate location pays the corporate rate by tax journal record id, a public department is funded through its treasury, no employer is left without a prior, and src/core2/business-books.test.ts plus src/core2/business-books-naics.test.ts prove it; the row is resolved in stopgaps.json.

**Files.** src/core2/data/business-books.json, src/core2/business-books.ts, src/core2/opening-finance.ts, src/core2/data/business/naics-crosswalk.json, src/core2/business-books-naics.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Existing authored workplace classifications mapped to corporate industry priors and explicit excluded institutional funding routes; no legal form, supplier relationship or budget is established.

Oct 20 (pool feeder): spec written; legal form needs the owner record, so this waits on world-stopgap-business-generated-identity. The Oct 19 research row (B-people-behavior-2.json) agrees: map each class to its NAICS sector priors with an all-industry fallback, keep nonprofit and public exclusions.
