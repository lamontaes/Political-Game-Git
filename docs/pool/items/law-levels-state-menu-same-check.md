---
id: law-levels-state-menu-same-check
title: "Law levels: the bill paper makes the same power check for a state body as the draft does"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: law-levels-counties
pr: #7317
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T17:13:46.331Z
---

**What.** billCatalog showed every state and federal entry as within its own power while the draft check (checkedText) reads the power catalog for state policy questions (docs/reports/law-levels-2026-11-05.md, Part B, menu).

**Rules.** One check for every body; no automatic within-own-power; no dice.

**Done when.** billCatalog's authority for a state or federal body equals policyAuthority for a policy question and beyondPower for an amount; a test on a drawn place shows the menu and the check agree for every state-level question.

**Files.** src/core2/bill-catalog.ts,src/core2/bill-catalog-state-authority.test.ts

**Notes.** TODO
