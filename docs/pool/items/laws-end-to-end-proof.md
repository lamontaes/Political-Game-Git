---
id: laws-end-to-end-proof
title: "One played life proves a law from negotiation to a named person and back"
area: laws
kind: wiring
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: words-law-effect-learned-journal
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
---

**What.** The owner keeps hearing that laws work, "from negotiation to its effects," without seeing it. This item is the laws lead's acceptance: one played life in a drawn place where the player proposes a law, negotiates for it by trade or favor on the record, and the bill passes or fails by the members' own reads of their lives and districts. If it passes, the law in force changes, one named person's money or life changes because an engine read it, that person learns of it from news they received, their view or choice moves with that news as the cited reason, and the director's scene and the journal say so. The proof names every record id along the way.

**Rules.** The chain is the acceptance: record, law in force, payment or price, person reached, choice or view moved, director scene or journal line, each by record id. Ask why: the person's stance cites the outlet or conversation that told them (knowing is a read). No dice: every member's vote comes from their recorded reasons, never a roll. No hand-written player text: the scene and journal words come from the English engine.

**Done when.** A test (`src/core2/laws-end-to-end.test.ts`) plays one year of `buildBenchWorld` with every module in a place drawn from all 56, seed named, and records by id: the player's bill, each negotiation offer and the favor or trade it recorded, each member's vote with its reasons, the law-in-force change, the `lawApplied` row, the journal entry or price that moved for one named person, the news item they received, the stance or choice that moved citing it, and the scene and journal line. A second drawn place where the bill fails shows the members' reasons. Screenshots of the scene and journal go in the PR body.

**Files.** src/core2/laws-end-to-end.test.ts, src/bench/path-check.ts, scripts/law-wiring/year.ts, docs/reports/law-wiring-2026-10-20.md

**Notes.** Added Oct 24 by the CTO as the laws lead's acceptance (docs/work-orders/lead-laws-2026-10-24.md). Built last, once the families land; the lead may start it earlier on a stopgap and say so. Where a link of the chain breaks, file it as its own item and name it here.

In PR #5968 (laws lead, Oct 24). The done-when's screenshots line waits on the owner grading nine wording pieces; the lead moved it to `laws-end-to-end-screenshots` (blocked on that grading) and asked the CTO in the PR to accept the split.

Laws lead, Oct 24 20:25: blocked. Merger 0's send-back (18:51) is right: the proof's journal row and bank lines are the Words session's files, so they move to `words-law-effect-learned-journal`, and the screenshots wait on the owner's grading (`laws-end-to-end-screenshots`), a split the CTO has not yet accepted. The branch stays claude/laws-end-to-end-proof; it drops its copy of the two bank files once Words lands them.

Sent back 2026-10-24 from PR #5968 (branch claude/laws-end-to-end-proof): the screenshot Done-when row is explicitly Not met and still in this item without an accepted bounded split, and laws-lead edits touch Words-owned journal banks/director data; finish on that branch, merge main into it first, reconcile acceptance and let Words own that slice.

Oct 25 (CTO ruling): the screenshot split is accepted; the screenshots live in `laws-end-to-end-screenshots` (lead play-first, p1). This item's done-when is met on records (the test, the record ids, the journal row by id); the screenshot line is struck from it.

Oct 27, laws-and-effects lead: the draft #5968 is closed and split by the per-unit rule. Its engine units are #6371 (learning on the day a story is heard) and #6374 (the held bill keeps the chair's reasons); main already has the journal lines. The proof test is redone on main once both merge.
