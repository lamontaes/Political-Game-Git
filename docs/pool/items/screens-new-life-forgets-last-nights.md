---
id: screens-new-life-forgets-last-nights
title: "A new game from the same seed opens its own election night"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 17)
pr: 9879
blocked-on:
source: the first-election path the CTO put first (Nov 17, 03:25Z); found running election-day.browser.mjs twice on one bench
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** After one life watched its election night, a second New game from the same seed in the same session voted and never saw the returns. The day ran on past the count to the end of the month, with no returns and no result scene. A player who starts over in one sitting loses the first election's night.
Seen: Hampstead, Maryland, the governor's race of Nov 3, 2026, on main, the second run of the election-day check on one server.

**Cause.** Found in code: `src/bench/handler.ts`, the server keeps `nightsWatched` and `canvassedOn` keyed by person and race; `/api/newlife` and the developer's world build replaced the world without clearing them, and the same seed builds the same people and races, so `/api/election-night` answered the new life's night as already watched.

**Fix.** A new world is a new life: both builds clear the two lists (`forgetLastLife`), as a restart already did.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Fix the cause, never loosen a check: the election-day check is unchanged and passes twice on one server. Each new check fails on the old code: `new-life-forgets-last.test.ts` fails there with the last life's night still listed. One rule, all 56 places: the test draws its seed per run and names the place.

**Done when.** A second session plays one life to its election night in a drawn place, starts a New game from the same seed in the same session, votes, and sees that life's own returns, with a screenshot of the returns; the new test passes.

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/new-life-forgets-last.test.ts (new)

**Notes.** Crew line #9747.
