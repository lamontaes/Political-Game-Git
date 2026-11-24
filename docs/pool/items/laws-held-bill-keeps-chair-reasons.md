---
id: laws-held-bill-keeps-chair-reasons
title: "A bill the committee chair holds without a hearing leaves no reasons, so nobody can say why it died"
area: laws
lead: laws-effects
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/laws-held-bill-chair-reasons
pr: #6374
blocked-on:
source: "Split from #5968 (laws-end-to-end-proof) by the per-unit rule (owner, Oct 27)"
claimed-at: 2026-10-27T18:49:21.000Z
---

**What.** When a committee chair holds a bill without a hearing, the committee record keeps no votes and no reasons (`committeeStage` in `src/core2/modules/legislature.ts`). The chair's decision weighs their position on the bill and their temperament toward holding a hearing, but neither is kept. So a held bill's why cannot be shown to its sponsor or read by a scene.

**Rules.** No dice: the chair's decision stays their position plus their temperament, unchanged. Ask why: the record keeps the reasons the decision used. A record no engine reads yet is a registered stopgap naming its reader.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, every committee record carries the chair's reasons, and a test shows by record id that a held bill's reasons sum below zero and a heard bill's do not; the test fails with the change removed.

**Time box.** 1 hour.

**Files.** src/core2/modules/legislature.ts, src/core2/committee-chair-reasons.test.ts

**Notes.** Unit B of #5968, ported to today's main by a helper of the laws-and-effects lead. Its reader is laws-hold-record-names-the-sponsor (the sponsor-asks-chair scene and the held-bill press line).
