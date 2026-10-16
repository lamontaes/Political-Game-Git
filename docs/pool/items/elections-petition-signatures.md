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

**What.** Filing for an office that requires a petition has no signature step in core2: `requestSignature(api, filingId, signerId)` and `circulatePetition(api, { filingId, circulatorId, hours })` do not exist (only the old engine had one). Build them in the elections module: each signer answers from their own reasons, the hours spend the circulator's time, and filing checks the count the office requires.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place whose office requires signatures, a candidate collects them over days, each answer with its reason, and the filing office accepts or turns away the filing on the count, by filing and signer record ids.

**Files.** src/core2/modules/elections.ts, src/bench/filing.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Checked 2026-10-16 (claude session) against the register: this item contradicts a ruling. `docs/coordination/OWNER-DECISIONS.md` line 85 and `DECISION-REGISTER.md` line 119 say "Filing: no fee or petition mechanic; filing happens where the place's records say", and AGENTS.md's "This is a game, not a spreadsheet" names petitions among the real-life steps the game does not add. The register's petitions (line 74) are movement petitions, a person asking others to join a cause, not a filing requirement. Not built. The CTO should drop this item, or rewrite it as the movement petition if that is wanted.
