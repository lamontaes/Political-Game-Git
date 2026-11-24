---
id: gov-town-body-default-is-one-board-for-a-whole-state
title: "A town without its own record gets its state's one default board: every such Connecticut town has a three-seat Board of Selectmen, whatever its size"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: high
root: rc9-place-facts-one-default
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, root cause 9, "Place facts are one default stretched over 56 places")
checked: fable 2026-11-10
---

**What.** A town or township with no record of its own takes one board for its whole state. Read in the data on main, not measured in play: every Connecticut town without its own record gets a three-seat Board of Selectmen, though the row's own citation says "a town of ten thousand or more may elect more". The same file gives one flat size to 14 of its 16 states (Connecticut, Illinois, Indiana, Kansas, Massachusetts, Maine, Minnesota, New Hampshire, New Jersey, Ohio, Pennsylvania, Rhode Island, Vermont and Wisconsin); only two rows (Michigan and New York) vary the size with the town's population. A state the file has not read takes a three-seat Township Board, the most common size, and town charters are on file for 31 towns, all in one state. The player meets this on the Government screen, in who they run against and in how many votes pass an ordinance. Seen: the number of seats on the player's town board and the seats the player can file for.

**Cause.** Found in code: data/research/local-government/township-governing-bodies.json (the Connecticut row at line 7 carries a flat `seats` of 3; 14 of 16 state rows are flat) and `townshipGoverningBodyRules` in src/core2/gov-rules/township-governing-body-rules.ts (line 122), which picks the size from the state row's `seats` or its population `bands` and falls back to the national average. The banding code exists and only Michigan and New York rows use it.

**Fix.** Read each flat row's statute and add population bands only where the law varies by the town's size or form. Where a town's own board is unread, take the band for its population, marked ESTIMATED with the citation, and say on the Government screen that it is an estimate. Delete the flat default each banded row replaces. Where a statute really fixes one size for every town, keep the flat row and quote the statute in the PR body.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the board's size and name are read from the place's own row or its state's rule by population, and no state or town is named in logic. Estimate, never UNKNOWN: a town whose board is not read takes the size its state's statute gives a town of its population, marked ESTIMATED with the citation. Research before building: each state's row is rewritten from the statute as fetched and quoted, never from memory. Replace, never layer: a flat default that a banded rule replaces is deleted from the data in the same change.

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty, drawing again until the drawn place lies in a town or township with no charter record, and write down the place and seed. The Government screen shows the board with the seats and the name its state's rule gives a town of that population, the same number of members is listed, a vote on an ordinance needs a majority of that number, and a screenshot carries the place, the seed, the population read and the citation. Then the named repro: a Connecticut town of ten thousand or more with no row in `town-charters.json` (the builder names it and its population from `data/research/money/place-towns-acs-2024.json`) no longer opens with the same three seats as a village, or the PR body quotes the statute showing three is right for it. A test walks every state row and fails when a row whose citation allows more seats by size carries no population band. The owner plays it: he starts in a large New England town and the Government screen shows a board the size that town would really have.

**Waits on.** Nothing.

**Files.** data/research/local-government/township-governing-bodies.json (the Connecticut row at line 7; `nationalAverage` at the end), data/research/local-government/town-charters.json, src/core2/gov-rules/township-governing-body-rules.ts (`townshipGoverningBodyRules`, line 122; the size is picked at lines 164 to 171), data/research/money/place-towns-acs-2024.json, src/bench/government.ts

**Notes.** From the Fable audit, root cause 9. The audit read the data row and did not play a Connecticut town; it asked nothing about other states. Read on main, Nov 10 (helper), answering "check what other states' defaults do the same": the 14 flat rows and 2 banded rows listed in What; the data file's own note calls this "a known gap" ("A town that voted to enlarge its board, or that adopted a charter of its own, is not read yet and takes its state's size"). Not checked: whether each flat row's statute really fixes one size for every town (some do; a three-member township board is the law in several states), so the first step is to read each citation and band only the rows whose law varies by size. Related: `gov-municipal-body-name-uncompiled-towns` (done: the body's name for a town whose charter is not compiled), `elections-town-election-day-comes-from-the-place` (the same root cause for the election day).
