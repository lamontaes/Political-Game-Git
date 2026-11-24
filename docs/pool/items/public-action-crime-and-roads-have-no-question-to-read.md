---
id: public-action-crime-and-roads-have-no-question-to-read
title: "A town's crime and roads protests and rallies still draw every adult, because those two areas name no policy question for the join decision to read"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words-engine
model: sonnet
effort: medium
root: none
source: Account lead stopgap disposal, Nov 14 (found building the join decision)
claimed-at:
---

**What.** A strike, protest or rally now draws the people whose own view of the area's question, own group and week send them, so a bad term draws one or two in a hundred. The `crime` and `roads` areas in `src/core2/data/public-action/actions.json` name no policy question, so the decision has no view to read and pulls every adult alike: in Pekin, Ohio (seed `ab2b506363a1cbfb:0`) a crime rally held 129 named people and a roads protest 129, the whole town. Seen: the paper's line about how many residents protested crime or roads shows a whole town. Seen: on Nov 15 at Cottleville, Missouri (seed `pa-rally-pin:0`, a staged good term): the paper printed "A crowd of 3269 turned out in Cottleville" for the crime rally, more than half the town.

**Cause.** Found in code: `joinCase` in `src/core2/modules/public-action.ts` sets the pull to 1 for an area with no `question` (`view === undefined`). `RULES.crime` and `RULES.roads` carry `touches: "residents"` and no `question`.

**Fix.** Give each of the two areas a policy question from the `us-policy-positions` set the views engine already holds (a public-safety question for crime, a transportation-infrastructure one for roads), and delete the `view === undefined` branch so every area reads the person's stance the same way. Do not cap the size and do not add a weight.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** An effect is a read, not a record: the views engine's stance is read where the person decides. No dice. One rule, all 56 places: no place is named; Pekin is only where it was measured.

**Done when.** In a played world built with buildBenchWorld at Pekin, Ohio (seed `ab2b506363a1cbfb:0`), a staged bad term for crime and for roads gives actions that hold under a tenth of the town's adults and not the same people in both, each action named by its record id; a second session replays it in a drawn place and seed nobody chose.

**Waits on.** The join decision for public action (this thread).

**Files.** src/core2/data/public-action/actions.json, src/core2/modules/public-action.ts
