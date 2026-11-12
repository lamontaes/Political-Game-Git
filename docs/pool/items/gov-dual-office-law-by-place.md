---
id: gov-dual-office-law-by-place
title: "Which two offices one person may hold at once is read from each place's law, not one estimate"
area: gov
kind: research
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on: gov-dual-office-law-by-place-part-1-states-a-to-f, gov-dual-office-law-by-place-part-2-states-g-to-n, gov-dual-office-law-by-place-part-3-states-o-to-z-and-territories, gov-dual-office-law-by-place-part-4-played-world-proof
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** Which two offices one person may hold at once is one estimate, not each place's law. The reader treats any two elected mandates as incompatible because no per-place dual-office compilation exists. Compile each of the 56 places' constitutional and statutory dual-office prohibitions and exceptions (for example a state legislator who may also sit on a local school board), cite each by section, and replace the estimated pairs in the same reader. Places whose law is not found keep the conservative rule with a spread note. The work is four parts.

**Cause.** Found in code: `src/core2/office-incompatibility.ts` `incompatibleOffices` reads `src/core2/data/offices/incompatibility.json`, where each state row is ESTIMATED with stopgap `SG-GOV-dual-office-law` (marker at the function; row in `src/core2/data/stopgaps/gov.json`).

**Fix.** Land the three data parts (states A to F; G to N; O to Z, D.C. and territories), then the played-world proof. Each cited row replaces the estimate in `incompatibility.json`; the reader stays one function. Resolve the stopgap row when all 56 are cited or noted conservative.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** Research before building: each prohibition is cited by statute or constitution section with its retrieval date. One rule, all 56 places: the pairs live in data per place, never in logic. Estimate, never UNKNOWN: a place whose law is not found keeps the conservative rule marked ESTIMATED with the reason.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, a drawn place and seed named) and sees an officeholder elected to a second office keep or vacate the first, by record id, as that place's cited row says; the data holds a cited row for each of the 56 places, and `src/core2/office-incompatibility.test.ts` checks one place where a pair is allowed and one where it is barred.

**Waits on.** The four parts: gov-dual-office-law-by-place-part-1-states-a-to-f, gov-dual-office-law-by-place-part-2-states-g-to-n, gov-dual-office-law-by-place-part-3-states-o-to-z-and-territories, gov-dual-office-law-by-place-part-4-played-world-proof.

**Files.** src/core2/office-incompatibility.ts, src/core2/data/offices/incompatibility.json, src/core2/office-incompatibility.test.ts (new), src/core2/data/stopgaps/gov.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-dual-office-law; the earlier research endpoint was blocked by a firewall. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Each place's dual-office statutes by section; the conservative rule already decides, and no player reads the citation.
