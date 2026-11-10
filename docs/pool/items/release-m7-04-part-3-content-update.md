---
id: release-m7-04-part-3-content-update
title: "M7-04 part 3: a data-only update changes a game table without a reinstall"
area: release
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
milestone: M7
source: split from release-m7-04-updates-and-bug-reports in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A data-only update (for example a corrected parameter table or research file) reaches an installed game without a reinstall. The desktop package already has a runtime content module; this part makes a content bundle load over the shipped data and proves one table changes.

**Cause.** Design: docs/roadmap/later-specs-draft.md section M7-04 (content updates without a reinstall) and docs/packages/M7-early-access.md; desktop/runtime-content.mjs is the existing starting point.

**Fix.** Read desktop/runtime-content.mjs, decide what a content bundle may replace (data rows only, never code), load it over the shipped data at start, and prove one parameter row changes in the played game. Record the decision under OWNER DECISIONS NEEDED if it limits what the player sees.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: one content loader, the existing one. Nothing in a content bundle is code. One rule, all 56 places: the bundle replaces rows keyed by place or parameter, never a state named in logic.

**Done when.** A second session installs the desktop package on main, drops a content bundle that changes one parameter row, starts a played world in a drawn place, and sees the changed value read by the engine by record id, with the previous value back when the bundle is removed. A test in desktop/tests holds the check.

**Waits on.** Nothing in code. Early-access preparation (AGENTS.md: saves and release work wait for it) and the weekly reschedule.

**Files.** desktop/runtime-content.mjs, desktop/main.mjs, desktop/tests, docs/packages/M7-early-access.md

**Notes (depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have let a data-only bundle replace a game table without a reinstall, but a nightly Steam build already ships data and no player sees a bundle.
