---
id: laws-local-tax-average-own-state
title: "The law resolver reads only the played state local sales-tax average"
area: laws
kind: bug
priority: 2
size: S
lead: laws-effects
milestone: play-first
status: in-pr
claimed-by: lane-2/law-chain-reader
pr: #7251
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T13:13:15.618Z
---

**What.** The existing world-governing U2 plan identifies a jurisdiction leak in resolveLawInForce. Its local sales-tax fallback takes the first effective average from any state. Restrict that existing reader to the chain's own state and reuse one inTownChain predicate for pending rows before other legislatures begin writing laws. This is a bounded reader unit; the every-state-and-town parent remains open.

**Rules.** One rule, all 56 places: jurisdiction comes from the chain, never a named state. One engine per mechanic: keep the existing law resolver and budget/purchase readers. Wire to the world: show the existing reader consumed by the generated world's sales-tax engine. Do not insert a law and call it voted proof, loosen tests or change legislature, voting, core state or other lanes' files.

**Done when.** In a generated buildBenchWorld year drawn from all 56, name the town, replay, actual sales-tax law record and its existing budget/purchase consumer; a positive tax witness reaches a named household member. A pure adversarial-input regression puts another state's average first and still returns the own-state row, excludes outside pending laws, and fails with the original lookup. Fresh New Game passes and four serial years remain within 20 percent of the same-host base. The every-state-and-town parent remains unfinished.

**Files.** src/core2/laws-in-force.ts; src/core2/in-town-chain.test.ts; lane proof

**Notes.** U2 step1 in docs/work-orders/world-governing-u2-spec-2026-11-01.md. Searched pool for local-sales-tax-average, local average, inTownChain and own jurisdiction; older seller/negative-average items are done and address different issues. No equivalent live child. 2-hour time box for this bounded reader; wider U2/U3/U4 remain in gov-every-state-and-town-governs.

**Time box.** 2 hours for the bounded resolver, generated-world reader and countercheck.

**You will see.** Your town's sales-tax reader keeps its own state's local rate when other governments' law rows are present; broader sessions remain unfinished.

**Screenshot.** No screen change. The generated-world record proof names the law, tax reader, buyer and treasury payee.

**Checked by.** A session that did not build the change, on main.
