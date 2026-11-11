---
id: gov-congress-passes-policy-laws-part-1-question-list-from-data
title: "Congress files bills on a federal question list read from data"
area: gov
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data
pr: #8380
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc1-world-outside-town
source: split from gov-congress-passes-policy-laws in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:18:14.538Z
branch: claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data
---

**What.** Make Congress file bills on the questions listed in `data/research/campaigns/federal-questions-2026.json` (merged as #6887), through the one legislature engine on its session calendar (`congress-sessions.json`). In the Nov 9 played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af), Congress introduced five bills (two on the minimum wage, one on a Medicaid work rule, one on an income tax, one budget). With this part, Congress files on every listed question that has an effect reader, a recorded answer and members' stances. Each bill is introduced in its sponsor's own chamber, as today. Feeds: gov-congress-passes-policy-laws.

**Cause.** Found in code: `fileChanges` in `src/core2/modules/world-legislating.ts` (line 567) loops over `PLATFORM_QUESTIONS`, which is `Object.keys(axisOf)` of `data/research/campaigns/issue-axes-2026.json` (`src/core2/campaign-data.ts` line 39). Those 55 axes are measured from state answers, so only 4 of them are federal questions in `question-powers.json`: cannabis sales, adopt an income tax, the Medicaid work rule and the minimum wage (mapped to the federal series). That is exactly the four policy questions of the Nov 9 year. The 25 federal-only questions in `federal-questions-2026.json` are never looped over, and no code reads that file. They also have no axis, so `questionAxis` in `src/core2/campaign-views.ts` returns 0 for them and every member's and the President's stance (`ownStance`, `memberSupportAt`, `personStance`; `src/core2/officials-roster.ts`) is 0. A 0 stance gives no filing reason, so even a widened loop would file nothing. Last, `src/core2/data/legislature/federal-answers.json` holds 2 answers; with no answer, `needsChange` files only "yes" bills, so Congress files a "yes" bill on a rule already in force (the Medicaid work rule, P.L. 119-21). The Senate files none because one sponsor is picked for each question across all 535 members (the highest reason wins) and with four questions the winners were all House members; that is not a defect.

**Fix.** Five steps, all data-driven:

1. Federal axes. Add `src/core2/data/legislature/federal-axes.json` with one row per question in `federal-questions-2026.json` that has a `latestFloorVote` with `parties`: `axis` is the phi correlation between voting for the question's "yes" and being Republican, from that vote's party counts (independents counted with the party they caucus with, Democrats in the 2025 Senate), tagged ESTIMATED with the vote's `url`. Read each vote's `what` and `motion`: where a yea on the motion means "no" on the question (for example a motion to table or strike), flip the sign and say so in a `note`. `questionAxis` in `src/core2/campaign-views.ts` reads `axisOf`, then this file, then 0. Do not add these rows to `issue-axes-2026.json`, which would put federal-only questions on town and state platforms.
2. The list. In `openSession` (federal only), pass `fileChanges` a question list: `PLATFORM_QUESTIONS` plus every question in `federal-questions-2026.json` whose `readerReads` is `key` or `outcome-web` (7 today: Medicaid work rule, minimum wage, power-plant carbon, tariffs, retirement age, vouchers, work rule for assistance). Give `fileChanges` an optional `questions` input that defaults to `PLATFORM_QUESTIONS`, so state and local bodies are unchanged. A question with `readerReads` of `series`, `budget-line` or none is left out: a law on its key is read by nothing (`series` readers read the tax tables, not the key).
3. Answers. Add to `federal-answers.json` the answer in force for each of the 7 admitted questions, read from that row's `currentLaw` and cited from it (yes where the statute already does it, the Medicaid and assistance work rules included; no where it does not, the $7.25 minimum wage included).
4. Keep the `SG-GOV-federal-proposal-coverage` call: 18 questions still have no reader. Change its comment to say the list admits only questions with a reader that reads the key or the outcome web.
5. Do not build companion bills. With 11 questions, senators sponsor where their reasons are highest, and a House-passed bill goes to the Senate through the engine already.

**Time box.** 4 hours for one Sonnet session.

**Rules.** One engine per mechanic: Congress uses the same legislature engine as every chamber. No dice: who introduces follows members' positions and the question list, never a rate. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (named with its seed) and sees Congress introduce bills on at least three questions from `federal-questions-2026.json` beyond the four platform questions, by session and bill record ids, introduced through the same engine as every chamber, and sees no bill that asks for a rule already recorded as the answer in `federal-answers.json`. `src/core2/world-legislating-federal.test.ts` proves it, and it names the sponsor's chamber for each bill.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/campaign-views.ts, src/core2/data/legislature/federal-axes.json (new), src/core2/data/legislature/federal-answers.json, data/research/campaigns/federal-questions-2026.json, src/core2/world-legislating-federal.test.ts (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:25 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.

Released (2026-11-11): The Fix's admission rule admits one question (only medicaid-work-requirement has an axis among those with a key reader) and filings get one sponsor in one chamber, so both chambers cannot file on the list; findings on PR 8380. Continue on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data and pull request #8380.

Nov 11 (cause finder for Fable B): read on main d64255aa31. Congress's filing loop is the state axis list, so only four federal questions are ever weighed; the 25 in the research file are never read and have no axis, so every stance on them is 0. The Senate's empty column follows from one sponsor per question across both chambers and is not a defect. The fix above gives the federal questions an axis from the file's own party roll calls, widens Congress's list to the 7 questions a reader reads, and records their answers. The axis also gives the President a stance, which part 2 asked for. Also found: the starting-law writer at src/core2/modules/laws.ts (about line 191) never gives the town the federal Medicaid work rule, because every state answers that question; that belongs to part 3.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:16 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.

Released (2026-11-11): Opus-tier high-effort item: admitting federal questions needs standing answers, stances and effect readers for 27 questions; file-from-data wiring alone leaves the stopgap in place and is not a bounded Sonnet part. Continue on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data and pull request #8380.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:17 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.

Released (2026-11-11): Opus-tier, not a bounded Sonnet part. Continue on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data and pull request #8380.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:18 UTC) on branch claude/pool-gov-congress-passes-policy-laws-part-1-question-list-from-data.
