---
id: history-laws-from-the-century
title: "Day one's policy laws are the ones the century's bodies since 1925 left"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/history-laws
pr: #9919
after: history-states-legislatures-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's answers to the calibration audit, Nov 17, 2026 (CTO line 6935086070 on #9747, "That includes ... laws"); History's family 4 plan (comment 6940725499); CTO lines 6936897718 (lift the pins) and 6943316647 (PR 4a's tests)
checked:
---

**What.** Every world opens with the researched 2026 answers to the 73 policy questions as its law in force, and each law's past roll call is padded with generated votes, or its date moved back, so that every real law passes.
Seen: `laws.ts:230` loads the research's answers; `past-laws.ts:185` generates the missing votes and `:535` moves the date.

**Cause.** Found in code: `openLaws` reads POLICY_QUESTIONS' answers for the state and the nation; `past-laws.ts` builds each law's enactment from the members serving now and fills the rest so the real law passes.

**Fix.**

1. After each November, Congress and the President, and each state legislature the century elects with its governor, sit a session (`electorate-century-laws.ts`). On each question every chamber votes by the one stance rule (`memberSupportAt`), each member at their party's typical position moved by their seat (`expectedIdeal`). A change takes force when every chamber passes it and the executive signs, or the chambers override at the body's override share.
2. `openLaws` loads the century's law on every question in a century world; under "today", the research's.
3. A law's history reads its century record and roll call; no generated votes, no moved date. A question no law stands on has no history.
4. Tests that asserted the real answers read the world's answer; law-mechanics tests open "just like today" (CTO line 6943316647), each with a Long game item to move to dev-mode enactment.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: each chamber's vote is its members' stances, never a roll. Replace, never layer: the research's answers are read only under "today".

**Done when.** At three drawn worlds, day one's law on every policy question equals the century's last record, at least two worlds differ on a question, a law's history reads its century roll call, and src/core2/electorate-century-laws.test.ts passes.

**Waits on.** history-states-legislatures-from-the-century (#9883), which this branch is stacked on.

**Files.** src/core2/electorate-century-laws.ts (new), src/core2/electorate-century.ts, src/core2/modules/laws.ts, src/core2/past-laws.ts, src/core2/officials-roster.ts, src/core2/modules/officials.ts, src/core2/modules/elections.ts, src/core2/data/stopgaps/hist.json, src/core2/electorate-century-laws.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. The amounts (taxes, wages, Social Security ages) and ballot measures are family 4's PRs 4b and 4c, which wait on family 5 and a petitions mechanic.
