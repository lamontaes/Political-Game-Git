---
id: law-levels-federal-amount-replacement
title: "Later Congress amounts replace starting state-specific federal rates"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: astra/federal-amount-replacement
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T21:41:59.000Z
---

**What.** resolveLawInForce unconditionally prefers a state-specific federal amount over a nationwide federal row. A later Congress Medicaid-match bill therefore cannot replace that starting amount. Apply the existing act-order rule to the federal candidates.

**Rules.** One shared resolver; level and jurisdiction are data. Preserve researched state-specific starting rates and same-act specific exceptions. No campaign, electorate, view or state-bar edits.

**Done when.** A generated-world regression draws a place, identifies its actual starting federal Medicaid-match row, drafts an authorized Congress replacement, and proves the resolver reads the later nationwide amount, a later specific act, and a subsequent nationwide act in order. It fails on the old resolver, passes ten fresh draws, and names place replay and rows. Reader fixtures are not claimed as votes.

**Files.** src/core2/laws-in-force.ts,src/core2/federal-amount-replacement.test.ts

**Notes.** Astra follow-up to every starting law having a reversal route. Two-hour time box, one session, no helpers. The federal Medicaid matching formula is 42 USC 1396d(b). Same-level competing federal amounts, not a new federal preemption doctrine.
