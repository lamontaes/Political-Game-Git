---
id: screens-elections-stands-plain-words-and-a-fitting-ballot-list
title: "Elections reads a stand as the question's plain words, lists the ballot in one uniform list with no headings, and never cuts a row at the panel's foot"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #10520
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: "CTO, Nov 24, about 1:50 p.m. Eastern (comment 7141204837 on #10377), the Replay's picture of #10363's county assessor race at Greenwald, Minnesota; the owner, Nov 23: 'Again, random ass laws like ban the box public hiring. What does that mean?' and 'Why is the 2021 on a different line?'"
merged-at:
claimed-at:
---

**What.** On the Elections screen (1440 by 900) the CTO found four things. (1) A stand reads as a catalog name: "Government administration: For", "Police protection", "Corrections". (2) The ballot list is cut off: "County Commissioner (District 3) ·" ends mid-row at the panel's foot, with no way to see the rest. (3) Rows break unevenly: "Coroner · County office" has "3 running" on its line, "County assessor · County office" puts "1 running" on the next, and "ALSO ON YOUR BALLOT · NOVEMBER 3" wraps. (4) Three labels ("On my ballot", "Offices you can run for", "Also on your ballot") stack over one list, and the approved menu look has none.
Seen: Politics, Elections, a race page with candidates, and the ballot list on a ballot with county offices, at 1440 by 900, in a drawn place. Guards: elections-offers.browser.mjs

**Cause.** Measured: Indian Wells, Arizona (place 0435310, seed ab4fc19c2a3382c028adf2b305a17bd8ab46b79c62574adbc2170b2e5434ee23), on main 885c1ebf, shows the three labels over the list and the aside under the name only on the first row; Bloomsbury, New Jersey (place 3406370) at filing shows the last row cut at the panel's foot. Found in code: (1) `racePage` in src/bench/play.mjs labels each stand with `policyLabel(st.question)`, which is the catalog's name (`controls.policyNames`: the bill catalog and the budget line names), not the question's plain wording in data/english/question-names.json. (2) `rosterScreen` (src/bench/ui/roster-screen.mjs) counts rows at 36 pixels each, but a pick row wraps to two or three lines (`.pick`, play.css, `flex-wrap: wrap`), so the box's height (`pager`, src/bench/ui/pager.mjs) ends inside a row. (3) The same `.pick` wraps its aside under the name only when the two do not fit (owner, Nov 16, N16-58), so rows break by length. (4) The Elections screen passes two group titles and the list's own title (`yourOffices`, `alsoOnBallot`, `title`).

**Fix.** (1) Each filing's stance carries `said`, the question's `about` words from data/english/question-names.json (`standWords`, src/bench/words.ts), and the row reads "A bigger police budget ... For"; a question the bank has not named (budget lines administration, otherPrograms and localAid) falls back to the catalog name and is listed as a line Story needs. (2) `rosterScreen` takes `rowHeight` and `wholeRows`, and `pager` cuts the box back to the last whole row that fits. (3) `rosterScreen` takes `stacked`, which always puts the aside on its own line (`.roster-stacked`), and every Elections row has an aside (a race with no one filed says so, with the existing label). (4) The Elections list is one list with no group titles and no heading (`headed: false`); the two group labels are deleted from controls.json and the line register's baseline lowered by two. Other roster screens keep their defaults.

**Time box.** 2 hours

**Rules.** Screen to mock: MENU-LOOK, no subtitles and no boxes; the approved menu look has no stack of headings. No hand-written player text: the words come from data (the question's own `about`), no label is typed. Lines needed, for Story: a plain wording (`about`, `to`, `for`, `against`) for `budget-line:administration`, `budget-line:otherPrograms` and `budget-line:localAid` in data/english/question-names.json.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Elections on a ballot with county offices and sees one list with no headings over it, every row's aside on its own line, the last row shown whole; opens a race with candidates and reads each stand as the question's plain words (for example "A bigger police budget"), never "Government administration" or "Police protection"; elections-offers.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/play.mjs,src/bench/words.ts,src/bench/government.ts,src/bench/ui/roster-screen.mjs,src/bench/ui/pager.mjs,src/bench/play.css,src/bench/data/controls.json,tests/guards/english/line-register-baseline.json,src/bench/elections-offers.browser.mjs

**Notes.** Not seen in the game (2026-11-25, Replay): Greenwald, Minnesota, seed ba363284-169e-42d3-8b32-bba1c1aa23cd, main abff6c6c08: County assessor race still shows Government administration For and Against in stands
