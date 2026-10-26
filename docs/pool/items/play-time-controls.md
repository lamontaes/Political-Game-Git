---
id: play-time-controls
title: "Day and Week buttons, and the calendar's skip-forward icon"
area: play
kind: feature
priority: 1
status: done
claimed-by:
pr: #4418
blocked-on:
milestone: M6
source: "owner, Oct 15"
---

**What.** The Day button advances one day; a new Week button advances seven; on the calendar, clicking a future day shows a small skip-forward icon (no label text) that runs time to that day; a scene fired by the director stops any advance at that moment.

**Rules.** No hand-written player text (control names from `src/bench/controls.json`); replace, never layer (the existing skip and calendar skip modes in `src/bench/player.ts` are replaced, not kept beside); Day never opens a choice list (owner, Oct 14).

**Done when.** In a drawn place, Day, Week and the calendar skip each advance the clock; a family scene fired mid-skip stops it on its day; a full-window screenshot of the calendar with the icon in the PR body, merged on the owner's yes.

**Files.** `src/bench/player.ts`, `src/bench/play.mjs`, `src/bench/controls.json`, the calendar sheet.

**Notes.** Supersedes the Oct 14 "no skip-ahead" ruling; see OWNER-DECISIONS.md, Oct 15 afternoon.
