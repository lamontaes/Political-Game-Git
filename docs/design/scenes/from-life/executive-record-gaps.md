# What an executive's year records, and what the owner's executive scenes still need

Scenes from life (`scenes-from-life`), owner's Oct 27 executive brief: "executive stuff, every level of government at different states... meeting with this executive, that executive." This is the evidence behind five engine items, and a map of which scene each record can feed. Words builds scenes; the records are the engine leads' to add.

## How it was asked

A played year (`buildBenchWorld`, two-level, a drawn place and seed) with the player as the place's mayor or governor, counting the durable records that name them (`personIds`) and the moments the director held for them. Mayors: Riverton, Wyoming; Prospect, Kentucky; East Bend, North Carolina; Woodway, Texas. Governors: Si'ufaga, American Samoa; Graball, Tennessee; Hindman, Kentucky; Bismarck, North Dakota; Woodway, Texas; Siesta Acres, Texas; Louisiana, Missouri; South Union, South Carolina.

## What an executive's records already carry

| Record naming the executive                                        | A mayor's year          | A governor's year            | Scene that fires                                                              |
| ------------------------------------------------------------------ | ----------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `bill-presented` (names the sponsor too)                           | 5 (Prospect)            | 20 to 29                     | the aide's desk scene; since #6250 the sponsor's or opponent's visit          |
| `press-story`                                                      | 17 to 20                | 47 to 121                    | the aide brings the story when it runs against the executive                  |
| `office.approached`, `town-hall`                                   | 1 to 15                 | none                         | constituent help                                                              |
| `executive-action`, `veto-override`                                | on a signing or veto    | 3 override votes             | the sponsor's thanks or the veto call; the reporter's questions               |
| `office-act`: legislative leaders                                  | none                    | 11 to 15 (weekly in session) | none                                                                          |
| `office-act`: budget proposal, state of the state, executive order | none                    | 1 each, once                 | none                                                                          |
| `budget-adopted` (3 to 4) and `budget-line-changed` (37 to 40)     | name no one             | name no one                  | none; the department head's argument is built (#6233) and waits on the engine |
| `official-appointed`                                               | name only the appointee | name only the appointee      | the appointee's thanks (an appointee who is the player)                       |
| `hazard.disaster`                                                  | name no one             | name no one                  | none                                                                          |

## The five gaps and their items

| The owner's scene                                                                         | What is missing                                          | Item                                                                           |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A department head brings bad news about their line                                        | the cut record names no one                              | `world-budget-cut-names-the-executive` (laws-effects, filed with #6233)        |
| A department head's line when it is a state agency's                                      | state cabinet posts have no budget line but the fallback | `world-state-cabinet-posts-draw-agency-lines` (laws-effects, filed with #6233) |
| An appointment to make, and the person who wanted it                                      | the appointment record does not name the appointer       | `world-appointment-names-the-appointer` (m0-m2)                                |
| An appointment to make: the vacancy itself                                                | nothing records that a head died or left                 | `world-department-head-vacancy-is-recorded` (m0-m2)                            |
| A disaster's first hours                                                                  | the disaster record names no one                         | `world-disaster-names-the-executives` (laws-effects)                           |
| A governor's emergency declaration                                                        | `declareEmergency` has no caller outside its test        | `world-governor-declares-emergency-in-play` (laws-effects)                     |
| A meeting with another executive (a mayor and the governor, a governor and the president) | nothing records one                                      | `world-executives-meet-in-records` (laws-effects)                              |

## Scenes the records already support, not yet built

- The governor's weekly meeting with the legislature's leaders (`office-act`, entry `legislative-leaders`, 11 to 15 a year). The topic would be a bill the leader's chamber sent the governor, which the sponsor's visit already covers when the bill is presented; a separate scene needs a topic the records do not yet hold apart from a bill.
- The governor's executive order (`office-act`, entry `executive-order`): one orderable order exists (restore the vote after a sentence). The people it reaches are named people with a finished sentence and a conviction on the justice record; none of the probed towns were checked for how many such people the world holds as full people.
- The governor's state-of-the-state and budget proposal: both are single yearly acts the player makes on the office screen; a scene around them wants the priorities the player chose, which the AI governor's record leaves empty (`changes: {}`).

## Not probed

- Whether a staffer ever resigns: staff are let go by the executive's own review (`staff.dismiss`), and the generic job engine records `quit` for named workers, but no probed year showed an executive's aide leaving of their own accord. A probe of a longer span is the next check before an item is filed.
- A county executive and the president's year. The president's address is a scene already (`address`).
