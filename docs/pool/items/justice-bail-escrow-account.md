---
id: justice-bail-escrow-account
title: "Posted bail sits in a court escrow account the treasury cannot spend"
area: gov
kind: feature
priority: 3
size: M
status: in-pr
claimed-by: claude/bail-escrow
pr: #5467
blocked-on:
after: justice-bail-moves-the-cash
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:28:32.520Z
---

**What.** PR #5365 moves a posted bail into the prosecuting government's treasury cash and returns what is left at the trial; the treasury can spend it first, so a return can come back short (recorded as shortMinor, stopgap SG-GOV-bail-not-escrowed). Add a court escrow fund account under the treasury's owner (registerCashAccount in journal-state.ts) that holds each bail apart from spendable cash, so the full bail is always returned at disposition and a forfeited bail is moved to the treasury by an explicit posting.

**Rules.** Every dollar balances and the journal's sequence, source and balance checks always run. Replace, never layer: the shortfall path and the stopgap row are deleted when the escrow lands.

**Done when.** In a drawn place (buildBenchWorld, seed named) one bail posted and returned in a played year shows the escrow account id, the posting into it and the posting out of it by journal entry id with the treasury's spendable balance untouched between, justice-pretrial.test.ts passes, and SG-GOV-bail-not-escrowed is resolved.

**Files.** src/core2/modules/justice.ts, src/core2/journal-state.ts, src/core2/data/stopgaps.json, src/core2/justice-pretrial.test.ts

**Notes.** Follow-up to #5365.
