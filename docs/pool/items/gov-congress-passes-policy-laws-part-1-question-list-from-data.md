---
id: gov-congress-passes-policy-laws-part-1-question-list-from-data
title: "Congress files bills on a federal question list read from data"
area: gov
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8380
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-congress-passes-policy-laws in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data
---

**What.** Make Congress read one source of federal law and file bills on a question list from `data/research/campaigns/federal-questions-2026.json` (merged as #6887) through the one legislature engine on its session calendar (`congress-sessions.json`). In the Nov 9 played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af), Congress introduced five bills and the Senate none; the House and Senate should both introduce bills on the questions the data lists. Only a question with a standing answer, members' stances and an effect reader is admitted, and the stopgap call is removed when the list covers them.

**Cause.** Needs cause. Measured by opus-5234 on main bdc92023f4 (PR #8380): `SG-GOV-federal-proposal-coverage` is registered at src/core2/modules/world-legislating.ts:1240 and data/research/campaigns/federal-questions-2026.json is read nowhere, but the Fix's admission rule leaves one question. Of the file's 27 questions, 7 have a reader that reads the key or the outcome web, and of those only `us-policy-positions:health-human-services.medicaid-work-requirement` has an axis in data/research/campaigns/issue-axes-2026.json; every member's stance reaches a question through its axis (officialStance, ownStance, memberSupportAt, personStance; src/core2/officials-roster.ts:301), so the other six read 0 for every member and are never filed. That one question is already US law (P.L. 119-21, operative 2027-01-01). And `fileChanges` gives each filing one sponsor across both chambers, introduced in that member's chamber (`originChamber`, world-legislating.ts:1640), so a list alone does not give both chambers bills. A finder decides where the federal-only questions' stances come from (the file's quoted roll calls by party are one source) and whether Congress files companion bills per chamber.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one opus session.

**Rules.** One engine per mechanic: Congress uses the same legislature engine as every chamber. No dice: who introduces follows members' positions and the question list, never a rate. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees both chambers of Congress introduce bills on questions read from `data/research/campaigns/federal-questions-2026.json`, by session and bill record ids, introduced through the same engine as every chamber; `src/core2/world-legislating-federal.test.ts` proves it.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/congress-sessions.json, data/research/campaigns/federal-questions-2026.json, src/core2/world-legislating-federal.test.ts (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:25 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.

Released (2026-11-11): The Fix's admission rule admits one question (only medicaid-work-requirement has an axis among those with a key reader) and filings get one sponsor in one chamber, so both chambers cannot file on the list; findings on PR 8380. Continue on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data and pull request #8380.
