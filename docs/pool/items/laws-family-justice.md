---
id: laws-family-justice
title: "Justice family: pretrial release, firearm storage, citizenship cooperation, convictions"
area: laws
kind: wiring
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: laws-justice-pretrial-release
milestone:
source: "split of laws-remaining-families (Oct 15)"
---

**What.** The justice laws other than the eleven in laws-record-only-reads: end cash bail (SG-GOV-REACH-A-pretrial), child access prevention (SG-GOV-REACH-A-firearms), partnering with federal immigration enforcement (SG-GOV-REACH-A-citizenship), restoring voting after a sentence (already read by the voting mechanic). The justice engine hears only corruption cases, so each needs a case route first.

**Rules.** An effect is a read; no dice; one rule, all 56 places.

**Done when.** Split into bounded items by the session that claims it, after the justice engine hears more than bribery.

**Files.** src/core2/modules/justice.ts, src/core2/law-reach/group-a*.ts.

**Notes.** Owner: police and the war design are 1.0.

Split Oct 19 (claude/peaceful-ritchie-03780x) into laws-justice-pretrial-release, laws-justice-firearm-storage and laws-justice-citizenship-cooperation, each gated on gov-justice-incident-records. Restoring voting after a sentence is already read by the voting mechanic, so it has no item.
