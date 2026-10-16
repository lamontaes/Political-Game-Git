---
id: elections-petition-signatures
title: "A candidate's petition: requestSignature and circulatePetition"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Filing for an office that requires a petition has no signature step in core2: `requestSignature(api, filingId, signerId)` and `circulatePetition(api, { filingId, circulatorId, hours })` do not exist (only the old engine had one). Build them in the elections module: each signer answers from their own reasons, the hours spend the circulator's time, and filing checks the count the office requires. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place whose office requires signatures, a candidate collects them over days, each answer with its reason, and the filing office accepts or turns away the filing on the count, by filing and signer record ids.

**Files.** src/core2/modules/elections.ts, src/bench/filing.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
