---
id: legislature-ask-before-the-roll-test-red-by-seed
title: "The ask-before-the-roll test passes in every drawn place: the sponsor's evening ask is staged or the place is named as having none"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: governing/ask-before-roll-by-seed
pr: #6983
blocked-on:
lead: governing
source: Checker 2, Nov 1; filed by the governing lead
claimed-at: 2026-11-01T15:39:52.443Z
---

**What.** src/director/ask-before-the-roll.test.ts fails on clean main with GOLDEN_PATH_SEED=chk2-b, in Springfield, Oregon, with no vote ask staged (Checker 2, Nov 1). The evening before a floor vote the sponsor of a failing bill asks the members it needs (askBeforeTheRoll in src/core2/modules/legislature.ts), and the director stages the ask to the player. In this place either no ask is written, so the engine missed a bill it should have asked about, or one is written and not staged, or the drawn place has no close floor vote and the test should redraw with a printed reason.

**Rules.** Ask why: name the record that was or was not written (the vote-ahead row, the bill, the roll call date) before changing anything, and never loosen a check to get green. One rule, all 56 places: the fixed test passes on chk2-b and three fresh seeds, each printing its place, and any redraw names the place skipped and why.

**Done when.** The test passes with GOLDEN_PATH_SEED=chk2-b and three fresh seeds, each printing its place and the vote-ahead record id it staged; the PR body names the cause in Springfield, Oregon by record (which bill, which date, which record was missing) and whether the engine, the director or the test was wrong; an engine or director fix has a break-it run.

**Files.** src/director/ask-before-the-roll.test.ts, src/core2/modules/legislature.ts

**Notes.** Found by Checker 2 on Nov 1 while regating #6912. The director's staging is the Words session's area: ask before changing src/director code.
