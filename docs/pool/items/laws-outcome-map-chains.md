---
id: laws-outcome-map-chains
title: "One played-world chain per law family, from the law to a named person and the director's line"
area: laws
kind: wiring
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: laws-outcome-map,laws-outcome-justice,laws-outcome-labor-cannabis,laws-outcome-health-fiscal,laws-outcome-civil-tech
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for the law-reach policies whose mechanic was none or records, so no other engine read what they wrote (src/core2/law-reach/group-a.ts and group-b.ts). The claiming session split them by family into laws-outcome-justice (done), laws-outcome-labor-cannabis, laws-outcome-health-fiscal and laws-outcome-civil-tech, and laws-outcome-map built the outcome map they report into. When these are done, this item is closed by checking that the placeholder list in the law-reach guard is empty and that one law per family has a recorded chain: the law, the payment or price it changed, the named person reached, their choice or view, and the director's line.

**Rules.** The chain is the acceptance: one dollar or rule per family is followed to a named person and back out to a choice and a journal line. An effect is a read, not a record: another engine must read what each law writes. No dice: reach comes from traits, money and the law in force. Replace, never layer: each placeholder is deleted when its real effect lands. One rule, all 56 places: the place is drawn and named.

**Done when.** After the child items are done, in a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), no law-reach policy has a mechanic of none or records, and src/core2/law-reach-group-a.test.ts and src/core2/law-reach-group-b.test.ts name, per family, the law record id, the changed payment or price record id, the person record id, the choice or view record id and the director line.

**Files.** src/core2/law-reach/index.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach-group-a.test.ts, src/core2/law-reach-group-b.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the family split already exists as five pool items; the preschool and college-tuition policies are carried by laws-reach-b-schools-preschool-tuition (not by laws-outcome-health-fiscal's merged title alone), and the Medicaid coverage reader by gov-medicaid-coverage-reader, so this roll-up also waits on them.
