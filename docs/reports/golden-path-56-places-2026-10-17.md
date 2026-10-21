# In 29 of 56 places a new officeholder's law reaches the town and gets talked about

**Lead.** I followed the player's path once in each of the 56 places: file for office, campaign, win a seat, draft a bill, negotiate, vote, and wait for the law. No place crashed. In 29 places the bill passed, took effect, and neighbors who read about it could bring it up (step 10). One of them, Yona, Guam, also reached the next election, which weighed the vote (step 11). In 24 places the bill lost its vote, which is correct play. In two places a law took effect and no one printed it, because the town's local stations had closed. In one, a U.S. senator's bill never reached a floor.

## What a player meets

The path goes through the same screens and engines a player uses, with the character answering its own choices. The bill is the same in every place: a minimum wage raised by two dollars. Most councils and boards turn it down. That is a fair result, not a defect, and the bill's text is the one thing the check chooses.

| Furthest step                           | Places | What it means                                                                          |
| --------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| 11, the next election weighs the record | 1      | Yona, Guam                                                                             |
| 10, neighbors can bring the law up      | 28     | the law took effect and a local outlet printed it                                      |
| 9, the town changes                     | 2      | the law took effect and no one printed it: Cobb Island, Maryland and Midway, Louisiana |
| 8, the body votes                       | 24     | the bill failed (20) or was vetoed (4)                                                 |
| 7, negotiation                          | 1      | Waialua, Hawaii: the member is a U.S. senator and the bill was never scheduled         |

Grades: filing, campaigning, election night, drafting, negotiating and voting work in all 56. The law taking effect works wherever a bill passes (31 places). Neighbors hearing of it works in 29 of those 31 and does not work where the local press has closed. The next election using the record works where the seat comes up again within the run, and was reached in one place.

## Why

- **Why 24 bills lost (measured).** `src/bench/path-check.ts` drafts a minimum wage raise of two dollars an hour in the first place; members vote from their own views and the check does not whip votes. In Carolina, Puerto Rico a similar bill failed 0 to 0 because no member holds a view on the question, which is filed as `gov-bill-fails-when-every-member-abstains`.
- **Why two laws went unprinted (measured).** In Cobb Island, Maryland (1,774 people) the town opens with one newspaper and four stations, each with one reporter. The newspaper and one station closed on March 24, 2025, and by September 2026 all five had no reporter. A desk with no reporter prints nothing (`src/core2/press-desk.ts`, `runDesk` returns early when an outlet has no reporter). Midway, Louisiana ends the same way. The cause of the closures is not found; filed as `people-press-small-town-outlets-close`.
- **Why Waialua stopped at 7 (measured).** A U.S. senator's bill has no regular meeting and no state leader to ask, so it stays drafted. Federal floor scheduling is a separate engine and is not part of early access.
- **Why this count differs from the first run today (measured).** The first count credited the sponsor's own earlier bills in the town's autonomous legislating, such as Kivalina, Alaska's bills 2025-1 and 2025-2 from February 2025, which put 11 failed-bill places at step 9. The check now counts only the bill it drafts (`src/bench/reached.ts`, the `since` date).

## What happens next

Six defects that stopped this run are fixed. A household coming back from the wider population with a member missing no longer stops the game. An office job no longer ends on a day its holder worked. An employer raising pay on an opening no longer stops it either; that fix came from a stalled draft.

Three more fixes cover the path itself. A law that names no one now ranks in local news by the followers it reaches. A one-chamber legislature's speaker now sets its floor agenda. The check now waits for a mayor's signature and lets a legislator's own hearing pass.

Open: the two items above and a federal member's bill.

## After the press fixes

I ran the same 56 places again once the small-town press fixes were in. The two places where the law went unprinted, Cobb Island, Maryland and Midway, Louisiana, now reach step 10, because their local newspaper and stations stay open. The counts are now: step 11 in 1 place, step 10 in 30, step 8 in 24, step 7 in 1, and nothing crashed or ran silent. Arizona (Bullhead City) now prints its result and reads step 8.

Two places moved on the vote alone: Mattydale, New York went from a failed bill to an enacted one, and Georgetown, Mississippi went the other way. A town's vote depends on its members' views, which change when the world around them changes, so a place near the line can flip.

The press fixes were an opening cash buffer for local outlets, revenue sized to cover payroll taxes, and a post's hourly rate set over the hours its schedule runs. The last one was needed: the press staff were paid 20 percent over their listed pay.

## Method

One locality per jurisdiction, chosen by a hash of the jurisdiction (seed `all56`), three places at a time, each with `node --import tsx src/bench/path-check.ts` and `GOLDEN_PATH_PLACE_KEY`. Arizona (Bullhead City) printed nothing in the parallel run and read step 8 when run alone (382 seconds); the cause of the silence was not found. The next election (step 11) was not forced in this run, since it needs a flag and years of play.
