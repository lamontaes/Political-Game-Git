---
id: dev-mode-industries-against-do-nothing-bill
title: "Dev mode's money check compares industries against the same world given a bill that changes nothing"
area: play
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "owner, Nov 16, 2026, 01:58Z: the dev mode stuff should be built immediately, so it can be traced in the game; plan approved 02:08Z"
model: opus
effort: medium
root: none
---

**What.** Dev mode's money check compares this world with the same world left alone, by cash only. A law's effect on an industry (its staff, sales, pay, prices and businesses open) and what a law the town opened with is doing can be seen only by script today. The comparison world must pass a do-nothing bill for each bill passed here, because a bill's own hearings, news and dues move a world. Seen: the bill card's money check in dev mode, and later each law row on the laws-by-date view.

**Cause.** Measured: at Choteau, Montana (place 3014650), seed law-links-choteau, by `npx vitest run --dir . src/bench/dev-law-industries.test.ts`, a $3 minimum wage raise shows restaurant pay and prices above the twin, the opening groundwater limit shows farm sales 10% lower than without it, and before a passed raise starts the only businesses that differ are two restaurants paying $500 dues to fight it (interest-groups.ts `lobbyistFor`, `groupDuesMinor`). `DevMode.twinMoney` (src/bench/dev-mode.ts) compares cash by holder only.

**Fix.** A new src/bench/dev-law-industries.ts builds the twin from the world's recipe as `twinMoney` does, gives it a do-nothing bill at the same body, day and sponsor for each bill dev mode or the player brought (decided as the dev mark records) and a restating row for each law dev mode set, runs it to today, and compares the industries thread's one count (`industryTally`, src/bench/dev-industries.ts) by industry and by business. The opening-law check sets one starting law aside in the twin from the day after the opening. The page part is src/bench/ui/dev-law-industries.mjs, hooked through the laws thread's dev-view registration point.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the check reads the one industry count, builds no second count, and shows every industry a law reached.

**Done when.** A second session, in a drawn place (named, with its seed), passes a law through dev mode, runs the world a month, presses Compare industries on the bill card and sees the industries and businesses that moved against the twin, and sees an untouched world report no industry differs.

**Waits on.** The industries thread's industryTally; the laws thread's dev-view registration point.

**Files.** src/bench/dev-law-industries.ts (new), src/bench/dev-law-industries.test.ts (new), src/bench/ui/dev-law-industries.mjs (new)

**Notes.** Law-links thread, Nov 16, 2026.
