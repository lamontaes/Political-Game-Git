---
id: laws-family-school-vouchers
title: "Public funds for private schooling pay part of private tuition from the state treasury"
area: laws
kind: wiring
priority: 1
size: M
status: done
claimed-by:
pr: #4449
blocked-on:
milestone:
source: "split of laws-remaining-families (Oct 15)"
claimed-at:
---

**What.** Households with children aged 5 to 17 pay private tuition to the town private school (opening-private-tuition.ts, a monthly contract). When the public-funds-for-private-schooling law is in force, the state treasury pays a share of that tuition per child to the school or the household; a repeal ends it. Universal preschool has no preschool engine to read it and stays a registered record with that reason.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table (SOURCED voucher amounts by state program, ESTIMATED where not); replace, never layer.

**Done when.** In a played year in a drawn place: a named household with a tuition contract pays less (or is repaid) the month after the law takes effect, the state treasury's line shows the payment, by record id; repeal restores the full amount. The household cites where they heard.

**Files.** src/core2/law-reach/group-b*.ts, src/core2/opening-private-tuition.ts (read only), src/core2/data/laws/reach-group-b*.json, src/core2/data/stopgaps.json.

**Notes.** Tuition is the town aggregate spread over families (NCES), not a choice of who goes private; say so in the stopgap.

Sent back 2026-10-16 from PR #4449 (branch claude/laws-family-school-vouchers-2): merging main conflicts in docs/pool/items/world-counted-tuition-drops.md (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
