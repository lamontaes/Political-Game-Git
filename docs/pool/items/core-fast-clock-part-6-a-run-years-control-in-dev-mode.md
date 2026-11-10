---
id: core-fast-clock-part-6-a-run-years-control-in-dev-mode
title: "The fast clock, part 6: dev mode's Run panel runs the played world 1, 5 or 20 years and says how long it took"
area: play
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: design-country-tier
source: split from core-fast-clock-twenty-years by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** Dev mode can show the country's next twenty years as a forecast, and cannot run the played world twenty years. This part adds the control the owner asked for on Nov 8: click 20 years. It runs the played world itself, and the game's date moves.

**Cause.** Found in code: the Run panel's `outlookSection` (src/bench/ui/dev-run.mjs line 22) calls the `outlook` route (src/bench/dev-mode.ts line 1733), which steps a copy of the country and does not move the game's date. No control advances the played world by years.

**Fix.** Add a control beside it that advances the played world by 1, 5 or 20 years in results mode (part 1), shows one progress line per finished year, and ends with the seconds it took and the verdict of the tier's own check for counts that cannot be (`countryProblems` in src/core2/country-model.ts). Labels come from the same labels table the outlook's do. Use the shared controls (skill screen-to-mock). It refuses, with a worded reason, while results mode is unavailable.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Player screen text: no raw ids, ISO dates or unrounded numbers. Screens follow the shared controls. Read-only screens create no facts; this control is not read-only and says so in its label. Speed is reported as measured, one run, one number.

**Done when.** A second session, on main in a drawn place it names with its seed, turns dev mode on, presses the control for 20 years, and sees the game's date twenty years on, the seconds it took and the verdict line; it takes a screenshot before and after, then plays one week day by day with no error.

**Waits on.** core-fast-clock-part-1-a-results-mode-for-skipped-time.

**Files.** src/bench/ui/dev-run.mjs, src/bench/dev-mode.ts, src/core2/life.ts
