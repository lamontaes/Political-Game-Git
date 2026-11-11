---
id: gov-congress-passes-policy-laws-part-1-question-list-from-data
title: "Congress files bills on a federal question list read from data"
area: gov
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-congress-passes-policy-laws in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:25:40.090Z
branch: claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data
---

**What.** Make Congress read one source of federal law and file bills on a question list from `data/research/campaigns/federal-questions-2026.json` (merged as #6887) through the one legislature engine on its session calendar (`congress-sessions.json`). In the Nov 9 played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af), Congress introduced five bills and the Senate none; the House and Senate should both introduce bills on the questions the data lists. Only a question with a standing answer, members' stances and an effect reader is admitted, and the stopgap call is removed when the list covers them.

**Cause.** Found in code: `src/core2/modules/world-legislating.ts` registers `SG-GOV-federal-proposal-coverage` at line 1240 when it proposes a federal bill, and the federal question list is not read from the C2 research data. Plan: `docs/reports/world-governing-plan-2026-10-29.md` unit C1.

**Fix.** Read the federal question list from the C2 data in the world-legislating module, file each admitted question's bill through `draftBill` for both chambers, and keep a question out of the list until its answer, stances and effect reader exist.

**Time box.** 6 hours for one opus session.

**Rules.** One engine per mechanic: Congress uses the same legislature engine as every chamber. No dice: who introduces follows members' positions and the question list, never a rate. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees both chambers of Congress introduce bills on questions read from `data/research/campaigns/federal-questions-2026.json`, by session and bill record ids, introduced through the same engine as every chamber; `src/core2/world-legislating-federal.test.ts` proves it.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/congress-sessions.json, data/research/campaigns/federal-questions-2026.json, src/core2/world-legislating-federal.test.ts (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:25 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.
