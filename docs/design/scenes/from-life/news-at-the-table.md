# Episode: the news that reaches the house, and who tells whom (home, the day it lands)

Slug `news-at-the-table`. Types: `news-arrives`. Season: home and family. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened through the fetch tool (it returns a summary of the page, not the page verbatim):

1. Biography.com, "Joe Biden's first wife and daughter car accident story" (https://www.biography.com/political-figures/a5606269/joe-biden-first-wife-daughter-car-accident-story). Dec. 18, 1972. The man was a newly elected U.S. senator, working in a temporary Washington office. His sister answered the office phone, said there had been a "slight accident" and that they should go home; he answered, "She's dead, isn't she?" A rushed flight to Wilmington confirmed it. His two young sons survived (a broken leg; a fractured skull). He was sworn in as senator in January 1973 in the son's hospital room (source 2 says the hospital chapel; the two pages differ).
2. Yahoo News, "Joe Biden lost his wife and baby daughter 50 years ago" (https://www.yahoo.com/news/joe-biden-lost-wife-baby-100401449.html). Only confirms he was in Washington interviewing staff and was sworn in about two weeks later in the hospital chapel. It did not say who told the sons.
3. The Grio, Aug. 4, 2021 (https://thegrio.com/2021/08/04/missouri-cori-bush-eviction-fight-personal/). In 2001, pregnant and ill, she quit a preschool job; the lost pay led to eviction; the family lived about three months in their car; her own struggling family later helped her find a home. Nothing on who she told or what was said.
4. MPR News, July 2, 2009 (https://www.mprnews.org/story/2009/07/02/unemployment-solution-run-for-office). A laid-off data specialist and Minneapolis council candidate on unemployment checks and savings; no household conversation reported.
5. MPR News, Nov. 3, 2008 (https://www.mprnews.org/story/2008/11/03/obamas-grandmother-dies-2-days-before-election). A candidate learned of his grandmother's death mid-campaign (the article does not say who told him) and went ahead with his appearances.

Seen only as search summaries: the NPR transcript of the Bush memoir interview (503 on fetch), the Denverite item on a laid-off city official running for his wife's seat (403 on fetch), and Washington Times copies of the Obama story (403). Not found: any page that records the words of a household telling. The packet below takes shape from source 1 and says so.

## Fact packet (what happens, in substance)

- **Who:** the subject (here a man just elected to the Senate), the person who takes the call (a sibling working beside him), and the children at home (two small boys, one baby).
- **Tie to the news:** the dead are the subject's wife and child. Tie to the bearer: sibling and trusted aide.
- **Trigger on the record:** a death in the household, the same afternoon, away from the subject. The bearer learns it first, by phone, from a third person.
- **What the bearer does:** does not say it outright. Says "a slight accident" and that they should go home. Picks the softest true thing and the next step (go home now).
- **What the subject does:** reads the evasion at once and says the worst himself, as a question. The bearer does not deny it.
- **What follows:** a rushed trip home, where the facts are confirmed in person; the children are hurt, not dead, and their condition becomes the household's whole attention.
- **The choice:** whether the public duty that was about to start goes on. It did, but the oath was taken at the bedside.
- **What changed after:** the subject's routine moved to the children's hospital room; the sister's support is credited with helping the household recover (source 1); the man later named the loss in public speeches (search summary only, a 2015 commencement address).
- **The general shape:** news of a death, a lost job or a lost home reaches a public person from the person nearest, in softened words, and the receiver names the real thing. The other side of it (the subject carries the news home to a spouse or children) is the same scene with the roles reversed.

## Ask the engine

Type `news-arrives` (roles bearer, receiver, about; setting home or phone; causes `feeling:event:life.death` bearer from `household`, `money:job-ended`, `feeling:event:housing.eviction`). Played year, New Britain CT, seed `web-morning-1`: 5 fires (example moment `person_0289566afe5c1a52:2025-06-17:event:housing.eviction:...`); `funeral` fired once on `person_563685259e1ef3b8:2025-11-30:life.death:...`.

| Packet line                                                       | Record and firing                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A death in the household reaches the subject                      | Record exists (`life.death`, counterpart some); the type fires with `bearer` household, `receiver` subject.                                        |
| Bearer is a sibling who works beside the subject, not a housemate | Record exists (ties); `bearer` fills from `household`, so a sibling who lives elsewhere is not cast. Nothing fires for them.                       |
| Told by phone while the subject is away                           | Setting `phone` exists; no rule picks it because the subject is away at work. Nothing fires.                                                       |
| The bearer softens it ("slight accident")                         | No record: the bearer's choice of how to word it has no trait or tie in the bank.                                                                  |
| The subject names the worst himself                               | No record. Receiver moves exist (thank, blame, confront, comfort); no "guess it first" stance.                                                     |
| An injury to the children (not a death)                           | No record fires: causes list serious illness, not injury.                                                                                          |
| The subject then tells the children                               | Nothing fires: no cause binds the subject as `bearer` of a death.                                                                                  |
| A job lost, then an eviction, told to the household               | Record exists (`money:job-ended`, `housing.eviction`); fires, with the subject as bearer for the job and the household as bearer for the eviction. |
| The oath taken at the bedside                                     | Record does not exist: office-taking and a household crisis are separate engines.                                                                  |
| Later talks cite the afternoon                                    | Register `bring-it-up` is on the tag; no line reads what was said.                                                                                 |

## Gaps

| Gap                                                                                                   | Kind                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Bearer cast only from the household; a sibling, aide or friend who took the call is never the bearer  | producer (lead director): add a `bearer` fill from the closest tie when the cause is a death and no housemate is present |
| Bank has one line per cause ("{other} has died.") and one generic opener; no versions by trait or tie | lines (words lead)                                                                                                       |
| No stance where the receiver reads the evasion and says it first                                      | lines (replies)                                                                                                          |
| Injury to a household member is not a cause                                                           | engine: health (serious-illness only today; ask for `health.injury` to be added to the cause list)                       |
| The subject as bearer of a death to children or a spouse                                              | producer (lead director): a cause row with `bearer` subject for `life.death`                                             |
| The scene writes nothing a later scene reads (what the bearer said, how the receiver took it)         | producer (lead director): outcome record read by `bring-it-up`                                                           |

## Lines the bank needs

By trait and tie, substance only.

- **Bearer opens (a different version for blunt, gentle and evasive; for spouse, parent, sibling, aide):** blunt says it plainly in one sentence; gentle sits first and says there is bad news; evasive gives the next step and not the fact. A sibling or aide adds a task ("we should go home").
- **Bearer answers "is it what I think?":** yes without detail; yes with who else is hurt; asks the receiver to wait until they are together.
- **Receiver's four stances (the player answers):**
  - Thank: "thank you for telling me straight."
  - Blame: why was nobody there, why was it not said sooner.
  - Confront: guesses the worst out loud and makes the bearer say yes or no.
  - Comfort: turns to the bearer's own grief first.
- **After the call:** what the receiver does with the day (go now, finish one duty first, call the others); a line for each.
- **Reversal (the subject tells the household):** a version for a spouse and a version for a child by age; a version for a job lost ("I got let go") and one for an eviction notice.

## Other lives the same scene covers

- A candidate's job ends and she tells the household that evening: the congresswoman whose lost preschool job led to eviction (Grio, Aug. 4, 2021, above). Cause `money:job-ended`, bearer the subject.
- A candidate hears of a grandparent's death on the road, by phone, and carries on with the day's schedule (MPR News, Nov. 3, 2008, above). Cause `life.death`, setting `phone`, bearer not a housemate.
