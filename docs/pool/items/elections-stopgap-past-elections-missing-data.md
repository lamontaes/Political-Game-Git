---
id: elections-stopgap-past-elections-missing-data
title: "Stopgaps in past-elections (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr: #5747
blocked-on: research data: the row's replacement needs sourced data (Each territory's certified 2024 delegate and governor returns (territorial election offices) as research data, read in place of the town's ballots....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/past-elections.ts, kind missing-data"
claimed-at:
after:
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
size: M
checked: fable 2026-11-10
---

**What.** A territory's prior elections (its delegate and governor) count only the town's own ballots, since territories cast no presidential vote to scale from (stopgap `SG-CORE-past-territory-ballots`). The replacement data exists only as estimates from web summaries, not certified returns. Replace the estimates with each territory's certified 2024 delegate and governor returns, recording the deciding-round winner and share separately from first-round totals (PR #5747 was sent back because it called the largest first-round candidate the winner of a runoff), and read them in place of the town's ballots.

**Cause.** Found in code: `src/core2/past-elections.ts` (`stateBallots`, line 192, and `townBallots`, line 267) carries `SG-CORE-past-territory-ballots` (row in `src/core2/data/stopgaps/core.json`); `data/research/elections/territory-ballots.json` holds ESTIMATED figures from web summaries, not certified returns.

**Fix.** Replace the estimates with each territory's certified delegate and governor returns, record deciding-round winner and share separately from first-round totals, and read them in `past-elections.ts` in place of the town's ballots. Resolve the stopgap row.

**Time box.** 5 hours for one sonnet session.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE). Research before building: each figure is quoted from a fetched territorial election office page. One rule, all 56 places.

**Done when.** A second session starts a New Game in a drawn territory place (named with its seed), reads the opening's past delegate and governor races and sees the certified deciding-round winner and share, and a one-year played-world run shows another engine reading the returns by record id. `SG-CORE-past-territory-ballots` is resolved in `core.json`.

**Waits on.** Research access to territorial election office sites (the item's blocked-on).

**Files.** src/core2/past-elections.ts, data/research/elections/territory-ballots.json, src/core2/data/stopgaps/core.json

**Notes.** First row: A territory's prior elections (its delegate and governor) count only the town's own ballots, since territories cast no presidential vote to scale from.

Sent back 2026-10-20 from PR #5747 (branch claude/territory-past-returns): data/research/elections/territory-returns-2024.json MP.governor records first-round votes and only the runoff total; past-elections.ts:149-166 then calls the largest first-round candidate the certified winner. The body labels Torres (5728) the winner, but the cited 2022 Northern Mariana Islands gubernatorial election page says Palacios won the runoff with 54.14% to Torres 45.86%. Record and use the deciding-round winner/share accurately, and distinguish first-round totals from winning returns in the claims. The pool done-when also requires the replacement to be read by another engine in a one-year played-world run by record id; the new test only builds the opening and the body reports no completed year. Supply that proof before resolving SG-CORE-past-territory-ballots.; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5747 closed (no push for five days, handed back); the work is on branch claude/territory-past-returns; claim the item and merge main into that branch.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would replace estimated territory delegate and governor returns with certified 2024 ones; a number may stay an estimate.
