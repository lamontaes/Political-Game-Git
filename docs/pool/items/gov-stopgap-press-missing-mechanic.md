---
id: gov-stopgap-press-missing-mechanic
title: "Stopgaps in press (missing-mechanic): 4 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5581
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/press.ts, kind missing-mechanic"
claimed-at:
---

**What.** Replace or clear the 4 open missing-mechanic stopgap row(s) in src/core2/modules/press.ts: SG-PEOPLE-press-interview-conversation, SG-PEOPLE-press-favors-and-leaks, SG-PEOPLE-press-endorsements, SG-PEOPLE-press-employer-enrollment. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/press.ts

**Notes.** First row: An interview's answers carry the conversation's moves (plain, further, turn, brief) and the lie as record data, but the screen does not yet open the interview through the director's conversation, so the player cannot see

SG-PEOPLE-press-employer-enrollment was resolved in PR #5273 via enrollBusinessOwner in modules/business.ts. 3 rows remain open (SG-PEOPLE-press-interview-conversation, SG-PEOPLE-press-favors-and-leaks, SG-PEOPLE-press-endorsements).


Oct 20 (PR #5581): SG-PEOPLE-press-endorsements built. The other two rows are split into their own items so this one can close with the PR: gov-press-interview-conversation (director conversation) and gov-press-favors-and-leaks (after it).

Sent back 2026-10-21 from PR #5307 (branch claude/press-endorsements): The date-note and views-module repairs are present. The body names gov-stopgap-press-missing-mechanic, which is currently attached to another open PR #5581 and covers multiple press rows, while this PR only implements endorsements. Use a bounded endorsements item so this merge cannot complete the other PRs unfinished work. The shared item also requires a one-year buildBenchWorld replacement read by another engine by record id; the body instead labels its press.test.ts fixture played-style and gives no ordinary played-year chain. Add that evidence and the required Done when table for the actual completed item. No local gate pass is claimed here.; finish on that branch, merge main into it first.
