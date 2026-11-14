---
id: world-judges-seated
title: "Judges exist in the world as seated officials, so Politics → Government can show a Judicial branch"
area: gov
lead: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: owner, Oct 29 (Government screen answers: judges as read-only cards)
checked: fable 2026-11-10
---

**What.** On Oct 29 the owner answered that Politics → Government's Judicial tab shows "the judges who exist in the world as read-only cards", but no judge exists in the world: the offices engine seats no judgeship, and the Government screen's Judicial tab has nothing to draw (SG-PLAY-government-judicial-no-judges). Courts as play come after early access (owner, Oct 10), yet a town's county court, the state's supreme court and the federal bench have real judges a player would see named. This seats them as officials through the one offices engine, chosen as each place's law says (elected, appointed or retained), with no court mechanics added. Seen: the Judicial tab of Politics → Government, which shows judges as read-only cards (owner, Oct 29).

**Cause.** Design: owner, Oct 29 (docs/coordination/OWNER-DECISIONS.md, "Oct 29, 22:10 UTC": the Judicial tab shows the judges who exist in the world as read-only cards) and owner, Oct 10 (courts as play come after early access, so only who holds the bench is built here).

**Fix.** Seat judge offices at county, state and federal level through the one offices engine from a per-state selection-method data row, then draw them on the Government screen's Judicial tab with the existing member card. Resolve SG-PLAY-government-judicial-no-judges.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: how each state picks its judges is a data row per state, never named in logic. One engine per mechanic: judgeships are offices and seats in the offices engine, filled the way its other seats are, with no second roster. This is a game, not a spreadsheet: no court procedure is built here, only who holds the bench.

**Done when.** A second session, on main in a drawn place (place and seed named), opens Politics → Government → Judicial and sees county, state and federal judges as read-only member cards drawn through the existing member card, each a seated officeholder with a record id in the offices engine. A test in a buildBenchWorld played world shows judge offices with seated holders at the three levels, SG-PLAY-government-judicial-no-judges is resolved, and a screenshot is in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/data/offices/, src/bench/government-bodies.ts, src/bench/play.mjs, src/core2/data/stopgaps/play.json

**Notes.** Filed by the CTO, Oct 29, while building the Government screen to the mock. Read: OWNER-DECISIONS Oct 29 22:10 (the four Government answers) and Oct 10 (courts after early access); searched src/core2 for judge and judicial offices (none).

Nov 14 (Account lead builder, cluster 23): looked at and not built here. The data this needs and the repo lacks: (1) a per-state row for how each of the 56 places picks its county, state and appellate judges (elected, appointed, retained, term length), sourced; (2) judge offices and seat counts per level in src/core2/data/offices/ (no judgeship row exists today); (3) the federal bench's size and who sits on it. The offices engine can seat them once those rows exist; the work is the data first, so it stays an Opus item.
