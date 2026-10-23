---
id: release-pool-done-bare-id
title: "The done-on-merge workflow closes an item named by a bare first word, even a blocked umbrella"
area: release
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** `scripts/pool/done-on-merge.ts` takes the first word of a merged PR's body as the item to close when it matches an id, even without `Pool item:`. Family PRs that open with the umbrella's id in prose ("traits-wiring-audit (campaigns and candidacy)") closed the umbrella on merge, and the laws family PRs open the same way. It also flips a blocked item to done. Accept only an exact `Pool item: <id>` line, and never flip an item that is blocked on other items.

**Rules.** Look before you ask: the pool README already says line 1 is exactly `Pool item: <id>`, so the workflow follows that rule rather than guessing from prose. Wire to the world: the fix is proven by the workflow's own test with a body like the family PRs'.

**Done when.** `scripts/pool/index.test.ts` or a new done-on-merge test shows a body whose first line is "traits-wiring-audit (campaigns)" closes nothing, `Pool item: x` closes x, and a blocked item named that way stays blocked with a printed reason; the workflow run on a test merge shows the same.

**Files.** scripts/pool/done-on-merge.ts, scripts/pool/index.test.ts

**Notes.** Found Oct 24 by the CTO while splitting `laws-wiring-every-law` and `traits-wiring-audit`. Until it lands, every lead PR's line 1 is exactly `Pool item: <family item id>`.
