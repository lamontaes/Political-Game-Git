---
id: core-trusts-background
title: "Trusts simulated in the background for estate and inheritance taxes"
area: core
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
---

**What.** A trust holds assets, passes them outside probate, and the estate and inheritance taxes in force read it. No player-facing mechanic.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** A played-world year in a drawn place shows a trust's assets passing outside probate and a tax engine reading it, by record id.

**Files.** src/core2/estates.ts

**Notes.** Ruling: OWNER-DECISIONS.md, Oct 15 afternoon. Replaces SG-CORE-owner-decision-trusts.
