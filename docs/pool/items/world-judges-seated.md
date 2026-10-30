---
id: world-judges-seated
title: "Judges exist in the world as seated officials, so Politics → Government can show a Judicial branch"
area: gov
lead: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: owner, Oct 29 (Government screen answers: judges as read-only cards)
---

**What.** On Oct 29 the owner answered that Politics → Government's Judicial tab shows "the judges who exist in the world as read-only cards", but no judge exists in the world: the offices engine seats no judgeship, and the justice engine decides cases without a judge (SG-WORLD-housing-hearing-without-judge). Courts as play come after early access (owner, Oct 10), yet a town's county court, the state's supreme court and the federal bench have real judges a player would see named. This seats them as officials through the one offices engine, chosen as each place's law says (elected, appointed or retained), with no court mechanics added.

**Rules.** One rule, all 56 places: how each state picks its judges is a data row per state, never named in logic. One engine per mechanic: judgeships are offices and seats in the offices engine, filled the way its other seats are, with no second roster. This is a game, not a spreadsheet: no court procedure is built here, only who holds the bench.

**Done when.** In a buildBenchWorld played world from a drawn place (place and seed named), a test shows judge offices with seated holders at the county, state and federal levels by record id, and the Politics → Government screen's Judicial tab draws them as read-only member cards through the existing member card, with SG-PLAY-government-judicial-no-judges resolved and a screenshot in the PR body.

**Files.** src/core2/modules/offices.ts, src/core2/data/offices/, src/bench/government-bodies.ts, src/bench/play.mjs

**Notes.** Filed by the CTO, Oct 29, while building the Government screen to the mock. Read: OWNER-DECISIONS Oct 29 22:10 (the four Government answers) and Oct 10 (courts after early access); searched src/core2 for judge and judicial offices (none).
