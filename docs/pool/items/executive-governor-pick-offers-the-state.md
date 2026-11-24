---
id: executive-governor-pick-offers-the-state
title: "A player governor choosing a cabinet secretary is offered mostly the played town's people"
area: gov
kind: bug
priority: 3
size: M
status: merged
claimed-by: civic roles builder
pr: 9438
blocked-on:
source: executive-cabinet-drawn-from-the-state build, Nov 15
claimed-at:
after: executive-cabinet-drawn-from-the-state
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-15
---

**What.** When the player is governor and fills an open cabinet post, the people offered are the full people the world holds: the played town's residents, plus officials who hold no office. A governor of a small town's state is offered that town's neighbors, not the state's people. Seen: on the office screen, in the list of people a state post could go to.

**Cause.** Found in code: `stateNominationInput` (`src/core2/modules/executive.ts`) builds its pool from `api.state.people`. Nobody is copied or moved (each keeps their own home), but most full people live in the played town. The opening's own cabinet draw no longer has this fault (`cabinetCandidate`, executive-cabinet-drawn-from-the-state). The screen (`src/bench/office.ts`, `heads` and the appointment stop) names candidates with `personName`, which knows only full people and officials, and a read-only screen may not create people.

**Fix.** Add the state's people to the pool through `cabinetCandidate`, the same draw the opening uses, keyed by the post and the day the post opened. Give each drawn candidate a name the screen can read without filling them in (the identity `drawOfficialIdentity` already returns, or the counted record's person), and fill in or admit only the one appointed, through the same seating step as the opening (`seatCabinetPerson`). Known full people stay in the pool and keep their pull through `known`.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. Read-only screens create no facts. Unattended-world changes: year 1 and time per record at three places, with and without, twice each side.

**Done when.** A test pinned to a small town that is not its state's seat (place and seed named in the test file) makes the player governor, opens a post, and finds people from other towns of the state among those offered, by name, with no new person created by reading the list; appointing one fills them in where they live and puts them on the state payroll. A second session, playing a governor in a drawn small town in the running game, opens a cabinet post and sees people from across the state offered by name.

**Waits on.** executive-cabinet-drawn-from-the-state.

**Files.** src/core2/modules/executive.ts, src/bench/office.ts

**Notes.** Filed by hand from the cabinet build.

- Nov 15, civic roles builder: built on branch claude/project-thread-86yqt4-governor-pick. "Home" here and in executive-cabinet-drawn-from-the-state means where the person lives now (`drawStateHome`, by who lives in each town of the state), not where they are from. A birthplace or origin comes from the birthplace work, not from this draw. An unattended world never calls the governor's own pick (it is the player's office day and the office panel), so it runs the same code as before.
