---
id: laws-outcome-map-chains
title: "One played-world chain per law family, from the law to a named person and the director's line"
area: laws
kind: wiring
priority: 2
size: L
status: blocked
claimed-by: claude/political-game-pool-yucp92-n
pr:
blocked-on: laws-outcome-civil-tech
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:47:27.993Z
---

**What.** Nineteen law-reach policies still have a mechanic of none or records, so no other engine reads what they write (the guard in law-reach-placeholders.test.ts lists them). For each family, follow one law from its record to the payment or price it changed, the named person it reached, their choice or view, and the director's line, and replace the placeholder with the real effect. The claiming session splits this by family into bounded items first.

**Rules.** The chain is the acceptance: one dollar or rule followed to a named person and back out to a choice and a journal line. An effect is a read, not a record: another engine reads what the law writes. No dice: reach comes from traits, money and the law in force.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name the place and seed in the PR body), each law family has a test naming the law record id, the changed payment or price record id, the person record id reached, their choice or view record id and the director line, and the policy no longer has a mechanic of none or records.

**Files.** src/core2/law-reach/index.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach-placeholders.test.ts

**Notes.** Split Oct 20 (claude/political-game-pool-yucp92-n): the 21 placeholder policies are already divided by family into laws-outcome-justice (done, #5200), laws-outcome-labor-cannabis (in PR #5201), laws-outcome-health-fiscal (in PR #5179, with the sales tax) and laws-outcome-civil-tech (claimed, abortion, discrimination, age checks, facial recognition, data privacy, redistricting). The plain minimum-wage policy reads mechanic none on purpose: laws.ts raises every job under the floor on the effective date, so its effect is already a read. This item is done when those four are; it adds nothing of its own.
