---
id: gov-other-states-governors-addresses-reach-the-towns-news-followers
title: "People in the played town hear the State of the State of 32 other states' governors"
area: gov
lead: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Fable B, Nov 15 (seen while finding the cause of the speech-occasion red)"
checked:
---

**What.** In one January week, the people in a Tennessee town who follow its news hear the State of the State of the governors of 33 states, three speeches each. Only one of those governors is theirs. Each speech is recorded as given in the town. The player would see neighbors hold views moved by, and the news carry, the Massachusetts governor's address as if it were given down the street. Seen: the town's news and people's reasons for a view in January.

**Cause.** Found in code: `stateOfTheState` in src/core2/office-day-state.ts builds every governor's audience from that state's legislators plus `outletsHere(api).flatMap(followersOf)`, and gives the speech `placeId: lawChain(api).townPlaceId`. Both are the played town's, whichever state the governor leads. Since #9346, `scheduleGovernorAddresses` puts the address of every governor the world holds on the calendar. Measured: Oak Grove, Tennessee (4754700), world seed 5affb71e52fb1248c3d5ebd8ed99c64605f04b05d91e5104084a3fac3e6ee4db, one year from the game's start with the train at 53e4b29fe8: 99 State of the State speeches from 33 governors between January 6 and January 15, 2026. Each of the 96 by another state's governor was heard by 87 to 105 people, all of them people of the town, out of 1,209 people the world holds. Tennessee's own three were heard by 237.

**Fix.** In `stateOfTheState`, add the town's news followers to the audience only when `office.stateKey` is `lawChain(api).stateKey`. Another state's governor still gives the address (the result row stays, for the nation's record) and it is heard by that state's legislators only, with no town place on it. If the town's paper should carry another state's address at all, that is a story from the national record through the press, not a speech heard in the town.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no state is named in the logic; the town's own state comes from the law chain. An effect is a read: the address still writes its result row. Speed: 96 fewer speeches delivered to about 100 people each in January. Never loosen a test to get green.

**Done when.** In a drawn place it names with its seed, a second session plays to the end of the first January and sees on the train or main that the only State of the State speeches heard by the town's people are their own governor's, by record id, and that a governor of another state still has a result row for the address.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-state.test.ts

**Notes.** Nov 15 (Fable B): counted with a scratch copy of src/core2/speech-occasion.test.ts (not committed) that grouped the year's `speech.heard` records of kind state-of-the-state by the state in the speaker's seat id and counted each record's witnesses who live in the town. Not measured: how far the 96 speeches moved anyone's view, and what the President's address does.
