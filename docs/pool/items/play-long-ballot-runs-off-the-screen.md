---
id: play-long-ballot-runs-off-the-screen
title: "A ballot of eight races runs off the bottom of the window: the last races and Leave can't be reached"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Melfa, Virginia (bench seed 736f767b-e742-4fc5-bd5e-fd1c0ed9cc42, main 5e68cde1), November 4, 2025, at 1440x900. The ballot lists FOR COUNCIL MEMBER three times, FOR MAYOR, FOR ATTORNEY GENERAL, FOR GOVERNOR, FOR LIEUTENANT GOVERNOR and FOR DELEGATE. The panel runs past the bottom of the window: "FOR DELEGATE" is cut in half, its candidates and the Leave button are below the edge, and nothing scrolls or pages to them. A player can't finish the ballot or leave the polling place. A Virginia ballot in 2025 has a statewide slate on top of the town's races, so every Virginia life meets this.
Seen: the ballot paper at the polling place on a day with many races.

**Cause.** Found in code: src/bench/play.css, the pl-ballot rules (about line 5337) give `#ballot` `top: 6vh` and `bottom: auto`, so the panel grows with its races, and the earlier `#ballot` rule (about line 2350) sets `overflow: hidden`. src/bench/ui/ballot-paper.mjs puts every race in one column (`.ballot-sheet`) with no pager, unlike the menus, whose parts give back a row at a time (src/bench/play.mjs `openSheet`, the "No menu scrolls" pager, owner Oct 29).

**Fix.** Keep the ballot inside the window by the owner's no-scroll rule. Either lay the races in columns across the paper's width (the right side holds only "What I know about them"), or give the sheet the same pager the menus use, a race at a time, with Leave always in view. Follow the pl-ballot mock (skill screen-to-mock). src/bench/election-day browser check, or a new one, measures that the last race and Leave sit inside 1440x900 on a ballot of at least eight races.

**Time box.** 2 hours for one Sonnet session.

**Rules.** screen-to-mock: the ballot follows the approved mock and the shared controls, and no menu or panel scrolls (owner, Oct 29). One rule, all 56 places: the layout holds for any number of races, with no place named.

**Done when.** A second session, on main, plays a new life in a drawn place with a statewide election on the town's ballot (Virginia, New Jersey or a federal November), votes, and takes a screenshot at 1440x900. Every race and the Leave button are on screen or reached by the panel's own pager, and the vote is counted.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/ui/ballot-paper.mjs, src/bench/play.mjs
