---
id: journal-page-fills-panel-and-drop-cap-sits-on-its-line
title: "The Journal page is a fixed 1000 px inside a wider panel, and its drop cap sits apart from its line"
area: play
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pt-carryover-n8-c32
pr: #10322
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N8-C32, N8-C33)
merged-at: 2026-11-24T06:45:18.258Z
---

**What.** The CTO's catches C32 and C33 on the Nov 8 sitting: the Journal page is half empty, and the drop cap sits apart from its line. In a played Journal the page stops about 280 px short of the panel's right edge, and the big first letter ("I") is followed by a visible gap before "was".
Seen: Nov 23, drawn places, Journal at 1440x900. The prose is Words', and nothing here changes a line.

**Cause.** Found in code: the rule `.roster-screen { width: 1000px }` (about line 5450 of src/bench/play.css) fits the Journal's list and page into 1000 px, while the Journal panel is about 1290 px wide; and the rule `.journal-text .intro.lead::first-letter` set `margin: 2px 8px 0 0`.

**Fix.** `.roster-screen.journal` takes the full panel width, and the drop cap's right margin is 3 px. No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the width change is scoped to the Journal's roster screen, so the Guide, Patch notes and People keep the width their own approved looks use, and it adds no player text.

**Done when.** In a drawn place at 1440x900 the Journal page runs to the panel's right edge with no empty fifth, and the drop cap sits against its first line. A second session plays a new life, opens Journal, and sees the same in the running game.

**Waits on.** Nothing.

**Files.** src/bench/play.css

**Notes.**
