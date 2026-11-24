---
id: speed-other-governors-address-reaches-every-follower
title: "Another state's governor gives a yearly address to every legislator and every outlet follower"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead and the Skills thread, Nov 15: the paired performance guard measured the Train at 1.31 against 1.2 at Vilas, SD (place 4667340)"
claimed-at:
after:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
---

**What.** Every governor except the player's gives a State of the State speech once a year to each legislator in the state and to every follower of every outlet, one speech per platform question, and each hearer's views and drives answer it. Main did not do this. Seen: the Train's played year at Vilas, South Dakota (place 4667340, seed c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716) spends 0.9 s a year in it; main spent none.

**Cause.** Measured: a CPU profile of that year (inclusive time) puts `governorAddressDay`, `actOn`, `stateOfTheState` at 0 ms on main fa34439d and 878 ms on Train 3b168daf; under `deliverSpeech` the `emit` of each speech goes from 485 to 1,387 ms, spent in the witnesses' `drives.respond` (+226 ms), `views.stanceAfterCase` (+155) and `standingWith` (+93). The seed's per-witness cost is unchanged; there are many more witnesses. `office-day-state.ts` `worldGovernors` keeps every governor the player does not control, the player's own state's included. Setting `groupUnwatched: true` on the call (as the mayor's state of the city does in `office-day-acts.ts`) moved the year by nothing (office-day-state 1,011 to 1,095 ms), so the audience is not the unwatched group.

**Fix.** Follow the owner's Nov 5 ruling (OWNER-DECISIONS.md lines 205 to 213): for a governor outside the player's own chain keep only the result of the address (the question and the position taken, on the state's record, with the date) and build its audience on demand when a story, a scene or the player opens it; the player's own state's governor and Congress keep full delivery. The paper's and the news's lines about another state's address read the kept result.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Serves the Nov 5 ruling (simulate from the people there, keep only the result, generate on demand). Speed (`AGENTS.md`): no change may make a year more than 20 percent slower; never loosen the limit. One model, two tiers: the kept result is read by the same rule as a full address once opened.

**Done when.** A second session, not the builder, plays a year at a drawn place and seed it names, and sees a governor's address of another state in the news reading right, the player's own state's address played to its audience as today, and `npm run speed:year` at that place at least 0.9 s faster than the Train.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts; src/core2/modules/speech.ts; src/bench/world-state-address.test.ts
