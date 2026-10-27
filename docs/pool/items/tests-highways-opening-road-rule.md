---
id: tests-highways-opening-road-rule
title: "Highways test: a town whose highways line opens below its base already has a road rule, so the test fails before any change"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/highways-opening-road
pr: #6220
blocked-on:
source: laws-effects lead, Oct 26 (gate of #5986)
claimed-at: 2026-10-27T05:24:16.655Z
---

**What.** src/core2/law-reach/highways-road-condition.test.ts draws a place, then expects no vehicle-repair road rule before it cuts the highways line. In Nu'uuli, American Samoa (territory:AS:nua, draw seed 2aa9859b1c4d751010875138d6ced643539b05725beac122d7573dec1152d9a1, from the test's root seed 6f9beb4c4364f1455b5eaebcc6ef68acacc7270a64327238765041a9d16f9211), the opening world already holds the rule jurisdiction_cf061beda4b17c39:vehicle-repair:road at a 0.251 poor share, caused by law-reach:budget-line:highways because the line opens at 0.900 of its base. Clean main at b72ba9431e builds the same rule, so the test is red on main for any draw whose highways line opens below its base.

**Rules.** Wire to the world: the test must hold in every place the draw can reach, and one rule, all 56 places: a place whose line opens below its base is an ordinary case, not one to skip. The check compares against the opening rule rather than assuming none exists.

**Done when.** The test reads the opening road rule (or the base share where none exists) before the cut and asserts the cut raises the poor share above that opening value and the repair bill above the opening bill; it passes on the Nu'uuli draw above and on two fresh drawn places, each named with its seed in the PR body.

**Time box.** 1 hour, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/law-reach/highways-road-condition.test.ts

**Notes.** Laws-effects lead, Oct 26: found on the gate of #5986; reproduced on clean main by building the same draw.
