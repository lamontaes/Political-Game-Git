---
id: laws-outcome-map
title: "The outcome map: every law family's effect on the town as a read"
area: laws
kind: wiring
priority: 2
status: dropped
claimed-by:
pr: #5165
blocked-on:
milestone:
source: "overnight pool item 7"
claimed-at:
---

**What.** Each law family in src/core2/law-reach/ must show its effect on the town as a read: the chain from the law to a named person. A handler whose mechanic is none or records is an unregistered placeholder and must be replaced by a real effect, or registered with the reason it cannot have one. The map picks up where the remaining-families item stops. A player would notice laws that actually change prices, payments or who is served.

**Rules.** The chain is the acceptance: one dollar or rule is followed from the record to a named person and back out to a choice and a journal line. No dice: reach comes from traits, money and the law in force. One rule, all 56 places: checked in a drawn place with place facts in data. Ask why: each person's change cites the source by which they learned of the law.

**Done when.** One chain per law family, in a one-year played world (buildBenchWorld, a drawn place from all 56, seed named): the law record id, the payment or price record id changed, the person record id reached, their choice or view record id, and the director's line, plus the knowing source. The test in src/core2/law-reach-balance.test.ts or a new law-reach chain test covers each family. The owner plays it: pass a law and meet a neighbor it changed. **On screen.** Nothing yet: it would show on Politics → Issues and Government, and nothing there reads it.

**Files.** src/core2/law-reach/index.ts, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach-balance.test.ts

**Notes.** Picks up where the remaining-families item stops. Split on Oct 19 into laws-outcome-justice, laws-outcome-civil-tech, laws-outcome-health-fiscal and laws-outcome-labor-cannabis; it is done when all four are.

Measured Oct 19 (claude, nothing built): the two law reach data files hold 67 policies (41 in group A, 26 in group B). 22 have mechanic `none` or `records`; 17 of the 22 name a stopgap that is open or resolved in `stopgaps.json`, and 5 name none: `minimum-wage` (its effect is real, `laws.ts` raises every job under the floor), the 287(g) partnership and child access prevention (both reach named people and now have outcome-web links to produced outcomes, `crime`/`health.youth-firearm-deaths`), and the sales tax and grocery exemption in group B (their effect is real: `syncSalesTax` in `src/core2/modules/budgets.ts` sets the purchase tax each level collects; the `records` handler writes nothing for them, 0 reaches). So the five unregistered ones are not missing effects; their handler names are stale and misleading. What the item still needs is one chain per family from a law record to a named person's choice and a director line; no law-reach test yet follows a sales-tax or minimum-wage change to a named household's payment or choice. Start from `purchase-tax.test.ts`, which already follows the tax to the treasury.

Sent back 2026-10-20 from PR #5341 (branch claude/laws-outcome-guard): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5165 (branch claude/laws-outcome-map): This remains a planning split: the item Done when requires one complete law-to-payment/person/choice/director chain per family in a one-year played world, while the body explicitly says nothing is built yet. Preserve those requirements in the child items and leave the implementation umbrella unfinished; track the completed split under its own bounded planning item or finish the named chains. Also correct the title saying four items: the final body says three after withdrawing the duplicate labor/cannabis item.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5341 (branch claude/laws-outcome-guard): Fixer #5692 has resolved the conflict and owner/date header note and is merged into this branch. The remaining main-merge acceptance is not met: docs/pool/items/laws-outcome-map.md:20 requires one law-to-payment/person/choice/director chain per family in a one-year buildBenchWorld run, with the drawn place, seed and record IDs. The final diff only adds law-reach-placeholders.test.ts and a release declaration; the body explicitly says those played-world chains are not built. Supply that proof, or track this useful guard under its own bounded completion item without completing the unfinished outcome-map umbrella. Also refresh the stale body inventory (22 policies, 19 without effect and two new registrations): the merged-data inventory is ten placeholders, eight with open stopgaps and two verified external readers; no new registry rows remain in this diff. The fixer checks do not substitute for a separate main gate on the final parent.; finish on that branch, merge main into it first.

Oct 25 audit: cleared a stale blocked-on (its item or PR is done, or the acting CTO's Oct 20 ruling lets any builder build the director side while every word comes from the English engine).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `laws-wiring-every-law`; close into it and carry any line it lacks there.
