---
id: words-bill-title-says-its-level
title: "A bill's composed title names its own level: one row titles a federal House bill, a state bill and a town ordinance with that body's word"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
root: none
claimed-by: story/bill-title-level
pr:
after:
blocked-on:
lead: words
source: "The laws line, Nov 16 23:32Z (#9747): a federal House bill on the income tax series was titled for the local income tax"
model: sonnet
effort: medium
---

**What.** The one catalog row for a law's rate says "local" in its words, so a federal House bill that sets the income tax rate was titled "A bill for an act to set the rate of the local income tax". The same row is read for a state bill and a town ordinance, and the level word was typed into the row instead of read from the bill's body. A bill's title and its sections now say the level of the body the bill is before. Seen: on the bill paper of a House bill, a state bill and a town ordinance on the same tax.

**Cause.** Found in code: `composeBill` in `src/english/bill-sections.ts` and `billTitleOf` in `src/english/bill-names.ts` composed a purpose from `data/english/bill-sections.json` (amounts `income-tax` and `sales-tax`) and `data/english/bill-names.json` (`law:income-tax`, `law:sales-tax`, the ban on asking about criminal records on state job applications) with the word "local" or "state" typed into the row. The composer was never given the bill's level, which `billReach` in `src/core2/modules/legislature.ts` already returns.

**Fix.** Every such row loses its level word and gains one `{level}` slot. `composeBill`, `billNameOf`, `billNameFor` and `billTitleOf` take the bill's level (`billReach(api, bill).level`) and `levelSaid` fills the slot from the one list in `data/english/bill-names.json` (`levels`: federal, state, county, township, city); a bill whose level is not known says no level word. The bench's bill paper, the bill stage, the printed-words story readers and the director's purpose and floor-debate facts pass the level. The player sees it on a bill's title and sections at every level.

**Time box.** 2 hours, Sonnet.

**Rules.** One rule, all 56 places: the level word comes from the body's own level, never from a place named in logic. Estimate, never UNKNOWN: a bill with no known level says no level word rather than a wrong one.

**Done when.** A second session, on main, at a drawn place and seed, opens a town ordinance, a state bill and a federal House bill on the income tax and sees the city, state and federal word in each title and section, and no "local" on the state or federal bill.

**Waits on.** Nothing.

**Files.** src/english/bill-sections.ts, src/english/bill-names.ts, src/english/policy-names.ts, data/english/bill-sections.json, data/english/bill-names.json, src/bench/legislature.ts, src/bench/bill-stage.ts, src/bench/printed-words.ts, src/director/purpose-scene.ts, src/director/floor-debate-facts.ts

**Notes.**

- A village or a township says "city" or "township" from its level; the town's own class word (village, town) is not read yet.
