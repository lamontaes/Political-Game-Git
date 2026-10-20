---
id: gov-stopgap-press-missing-mechanic
title: "Stopgaps in press (missing-mechanic): 4 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5273
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
