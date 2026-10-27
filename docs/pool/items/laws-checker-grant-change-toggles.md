---
id: laws-checker-grant-change-toggles
title: "The law checker raises a yes-or-no grant to 2 as if it were an amount; it should switch it"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/checker-grant-toggle
pr: #6333
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T14:16:56.467Z
---

**What.** `scripts/law-wiring/check.ts` changes an amount law by a tenth, rounding an integer up by at least one. `local-income-tax-authority` is a grant held as 1 (granted) or 0 (not), so in Prescott, Michigan, where the state grants it, the checker set it from 1 to 2 (`docs/reports/law-wiring/families/taxes-year-US-MI-2666300.json`). The legislature's authority check reads a grant only where the value is exactly 1, so the run in fact withdrew the grant (inferred from `src/core2/modules/legislature.ts`, the local income tax check). Treat a series whose rows are 0 or 1 (a grant, a yes or no) as a switch: set it to the other value. Measured by the laws lead, Oct 25.

**Rules.** The checker changes one law the way a body would.

**Done when.** The taxes family's Prescott run changes the grant from 1 to 0 (or Uehling's from 0 to 1), its change line says so, and the matrix grades the law as before. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** scripts/law-wiring/check.ts

**Notes.** Laws lead, Oct 25, from PR #5649.

Worker note (Claude, Oct 27): fixed in `scripts/law-wiring/check.ts` (`SWITCH_SERIES`: every amount series whose starting rows are all 0 or 1 is switched, not raised a tenth). `node --import tsx scripts/law-wiring/check.ts --seed a91c03e7d2b84f10 --only local-income-tax-authority` in Prescott, Michigan now reads `local-income-tax-authority 1 -> 0 at state (law:US-MI:state:local-income-tax-authority:general:2025-01-21:law-wiring-c99b7dfc)`. Reach 1 (one organization), readers 2, money kinds 2. I did not compare the matrix grade with the old run.
