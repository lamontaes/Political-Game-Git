---
id: gov-past-closures-archive
title: "Business closures from the year before day one are archived news, generated from the business engine's past"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The news archive reports the year before day one but carries no business closures, because the generated past holds none: businesses start on day one. Generate the closures of the town's businesses in that year from the business engine's own past, as records with the owner, the workers and the date. Carry them into the archive so a shop that closed last year is in the news history and the people it employed remember it.

**Rules.** No dice: a closure comes from a business's books, its owner's reasons and the market, never a roll or a fixed percentage. Ask why: each archived story keeps the closure record it came from. One model, two tiers: a counted business closing is archived at counted level and filled in when the player meets it.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and a seed the builder did not choose, the opening's archive lists at least one business closure dated before day one with its record id, and the stopgap SG-CORE-past-no-deaths-closures is resolved. A test in src/core2 names the place, the seed and the closure record. **On screen.** Nothing yet: it would show on News, and nothing there reads it.

**Files.** src/core2/past-news.ts, src/core2/modules/business.ts, src/core2/past-business.ts, src/core2/data/stopgaps.json

**Notes.** Sent back Oct 20 from PR #5072 (branch claude/past-business-closures): diff contained unrelated edits under src/director/ and data/english/ outside the government area; finish on that branch, merge main into it first.

Split from gov-past-deaths-closures-archive (the deaths half is built there). The deaths come from the kin generator's life-table line; closures need a business history the generator does not yet keep.

Sent back 2026-10-21 from PR #5513 (branch claude/political-game-pool-yucp92-oo): `src/core2/past.test.ts:100-109` makes its only positive closure assertion conditional on both an expected count and a retiree, then checks the archive reader only inside a loop over closures. A drawn world with zero expected closures or no eligible former owner can therefore pass this entire new test with no closure or archive/read record checked. Add a bounded drawn-place search that requires at least one generated closure, its printed story, and the former owner’s heard record before success; keep a separate explicit zero-case test if needed. The owner/date cleanup fixes the prior return, but this vacuous acceptance path remains. Morning check blocks this head; no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5513 (branch claude/political-game-pool-yucp92-oo): The repaired closure test now requires a nonempty closure, its story and hearing, so the prior vacuous path is fixed. The separate acceptance in docs/pool/items/gov-past-closures-archive.md:20 still names a one-year run of the played buildBenchWorld world. src/core2/past.test.ts only builds openings (there is no advanceCore call), and the body/new Fixer receipt only reports opening closure IDs, with no played-year receipt. Supply the named year proof on the integrated result, or track this opening-only slice under a bounded item while keeping the broader acceptance open. Also the body says counted parents deaths were never part of SG-CORE-past-no-deaths-closures, but that original row explicitly includes them; describe the remaining counted-parent work as split into the new open row. No completed local gate is claimed for this source review.; finish on that branch, merge main into it first.

Oct 22 (claude): the opening archive built in PR 5513 is tracked as gov-past-closures-opening-archive; this item (the played-year acceptance) stays open.

Sent back 2026-10-23 from PR #5072 (branch claude/past-business-closures): current main conflicts in src/core2/past-business.ts and src/core2/past.test.ts; reconcile both changes and supply the Done-when evidence table; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: do not generate more proxy past; fold into the simulated-history session (OD:14).
