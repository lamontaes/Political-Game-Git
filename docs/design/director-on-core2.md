# The story director reads the new core: what moves a person becomes a moment

The owner may overrule the seven answers below; nothing else waits on the owner. The CTO answered for the owner on October 9, 2026, and the owner lowered the interrupt line from 0.63 to 0.50. A change in a watched person's records that reaches the floor of 0.11 becomes a moment, sized by the change, its channel and the person's traits, with no fixed table of moment types. With all 10,002 townspeople watched for a year, 1,096 moments were marked to interrupt. 970 came from 22 employer closures that ended most jobs, a core defect. No screen shows them yet; the five draft pull requests are unmerged. Watched lives will look wrong until the core's defects below are fixed.

## The owner's answers

The CTO answered these for the owner on October 9, 2026; the owner can overrule any of them. Answers 1 to 4 and 7 each set a number in the director's data file; answers 5 and 6 set rules. The package is five stacked draft pull requests, 3926 to 3930, one per part; none is merged. The answers are applied in the last, 3930, and the year proof was rerun there with them.

1. **A moment must reach 0.11.** That is the smallest adult row of the Holmes and Rahe stress scale, "minor violations of the law", 11 points. It is labeled ESTIMATED. Its check is a plausible yearly count of stored moments for a watched adult, taken from life-events research; that band is not set yet. It is registered as an open stopgap that blocks release, and setting it is this package's work, not the owner's. A smaller change still moves the person's thread with the other person; it is just not stored as a moment. Without a floor, Margaret, below, would hold about 4,000 moments by December.
2. **The interrupt line is 0.50, by the owner's ruling.** That is the scale's anchor event, marriage, 50 points, labeled TUNABLE. Its check range is the owner's ruling itself; the line moves only when the owner moves it. Margaret's job loss, at 0.509, ends the household's only pay and is marked as a scene that takes over the screen. Inferred from the rule: a lost job scores 0.47 times the share of the household's pay it took times the member's risk weight. By that rule, a job that was not most of the household's income scores under the line; it waits as a scene if it ranks within the pace, and otherwise becomes a journal line. Inferred from the rule: when a household loses its only pay, each member scores 0.47 times their risk weight, so only a member who avoids risk crosses the line; with a risk trait of 0 the score is 0.47. Measured in the year proof: lost jobs gave 3,303 moments in 2021, 1,258 to the workers and 2,045 to members of their households. 970 reached the line: 164 workers and 806 household members, all in households that lost their only pay and all with a risk trait of −1. The March 14 closure gave 161 of them, 32 workers and 129 household members. Deaths and disasters still interrupt. Inferred: the other 126 of the 1,096 moments marked to interrupt came from causes such as a relative's death or serious illness; the run's summary does not split them.
3. **The October 8, 2026 pace holds.** About 1 scene a year up to age 7, 2 from 8 to 12, 3 from 13 to 17 and 4 for an adult, ranked over the trailing year. Moments that rank within the pace wait as scenes; the rest become journal lines.
4. **Closeness halves in about 18 months without contact for friends, and about 36 months for relatives.** These are ESTIMATED from Roberts and Dunbar's 2015 study of how friendships and family ties decay. The fact that two people knew each other never fades.
5. **The years before the game.** Personal past facts become moments with an impact estimated from the stress scale: children's births, a partner, school years and a first job. Public events such as the September 2001 attacks, the 2008 recession and the 2020 pandemic are background for everyone who lived through them. Where a person's recorded past says one hit them, such as a job lost in 2008 or a death in 2020, it is a personal moment too.
6. **Being watched never changes what happens.** The director only reads. Measured from the code: the core gives daily detail to the player, the player's family, household, known people and coworkers, and anyone named in a focus list (`src/core2/focus.ts:4`); everyone else acts weekly. The core, not the director, decides who gets daily detail.
7. **Anniversaries weigh in, but never stage a scene.** A weight is highest on the date and halves for every 7 days before or after it, so it never reaches zero; it is TUNABLE. Callbacks come through people, so the weight raises how strongly a later moment between two people who shared an event links back to it near the date.

## The test town

Measured: the new core's own measurement tool built La Homa, Texas, in Hidalgo County: 10,002 people from the seed `p8-real-life-cost-2026-10-09`, opening January 1, 2021. It is the same town and seed the core's finance year uses. The tool chose the watched person by a hash of the seed among recorded workers.

**Margaret Harrell**, 51, is a cashier at Hidalgo County Mercantile, paid $58.63 for each day worked, which averages $34.26 a calendar day. Margaret's partner Peter, 57, has no recorded job, so Margaret's pay is the household's only earned income. Their children are Ava, 14, Alexis, 13, and Taylor, 10. Margaret's recorded traits are reliable, duty-bound, generous and contented, and Margaret avoids risk and conflict. Margaret's recorded past holds Laurel Hill Elementary from 1975, Laurel Hill Middle from 1981, Magnolia High School from August 1984, the births of the three children, and Peter as Margaret's partner since 1994. Twenty people who started at Magnolia High with Margaret in August 1984 are recorded as people Margaret remembers by name. None has any closeness or contact on record.

Feelings and closeness in the core run from −1 to 1, with 0 meaning nothing recorded. What Margaret's year held, measured from one run of the core with finance on, January 1, 2021 to January 1, 2022:

- **The first week:** nothing touched Margaret. No event named Margaret, no tie changed, and the pay arrived on schedule. Margaret's stress rose from 0.195 to 0.219 as it drifted toward the model's resting level, which is not a cause.
- **January 10 and 11:** Margaret asked to join two local groups, recorded as one event each.
- **January 12:** a classmate, Tyler Short, contacted Margaret for the first time on record, and their closeness rose from 0 to 0.05. By January 13, all 20 classmates had been in touch. Each of them contacted Margaret on 134 to 236 of the 355 days from January 12, 2021 through January 1, 2022. Each pair's closeness settled at 0.50.
- **March 1:** after the month's living costs were taken, Margaret's cash was $0. The core records the household's living costs as $108.89 a day, $54.45 for Margaret and $54.44 for Peter, about $3,314 a month. The three children carry no cost of their own in the record. Margaret's pay averages $34.26 a calendar day, about $1,043 a month, so the household is about $2,271 short each month.
- **March 14:** Hidalgo County Mercantile closed because it could not pay its wages. The closure ended 218 jobs, Margaret's among them. The core recorded it as a public event naming every worker, with no feeling attached, so Margaret's mood and stress did not move.
- **The rest of the year:** on April 1 Margaret's cash was $223.15. Margaret's cash was $0 on the first of every month from May 2021 through January 2022. No other income is on record. Not checked: how the core divides the monthly costs between Margaret and Peter, and how it took April's costs when the last pay was smaller than a month's costs. Margaret's mood was 0 all year, because no event in this core carries a feeling for Margaret.

On the 365 simulated days from January 2, 2021 through January 1, 2022, Margaret's free-time choice was rest on 355, looking up a local office on 7, asking to join a group on 2, and contacting someone on 1. Margaret's partner Peter and the children Alexis and Taylor have family ties from the start of the run, and the core recorded no contact with any of them all year. Ava, another child, was in touch on 29 days.

The records hold a lost livelihood, a family with no earner, 20 old classmates and a public closure. Margaret's recorded mood and stress change for none of it. The director has to read the money, the ties and the event, not the feelings alone.

## Where the director lives

Built in pull request 3927, part 2: the director is a read-only module in a new folder of its own. Measured from the code: the core's creation function accepts extra modules, and the year runner installs the director beside the core's own modules that way (`src/director/tooling/director-year.ts:131`); no game screen installs it yet. Measured from the code: the core hands each module every event it subscribes to, with the people who learned it, and calls each module at the end of the day after its own modules (`src/core2/life.ts:305`). Measured: the test "reads the core without changing it" (`src/director/director.test.ts:226`, pull request 3927) runs the same seeded town with and without the director and requires the core's records to come out identical; it passes. That is the evidence that the director calls no writer and adds no story logic to the core.

What it reads, all through the core's interface (`src/core2/types.ts`):

| What the director reads   | Where the core keeps it                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| Each event, and who heard | The module event callback, with the people who learned it                    |
| Feelings                  | Each person's mood and stress, and the core's appraisal of each event        |
| Ties                      | The relationship table, its index by person, and recorded family links       |
| Causes                    | Each person's drives, which the drives package (P10) adds with their events  |
| Money                     | Cash, the person's job and its daily pay, and each work result's unpaid part |
| Home and health           | Household and place on the person record, and whether the person is alive    |
| Who knew whom             | The names each person knows, when and how they learned them, and their past  |
| Business closures         | The closure record and its public event                                      |

As the owner ruled, watched people are to be the player, anyone the player clicks into, and lives replayed by the life-replay harness (P9). Measured from the code: the program that creates the director passes the list of watched people (`src/director/ledger.ts:90`), and the director keeps a ledger for no one else; today only the year runner passes one. Measured from the code: for each event, the director checks each watched person once and skips anyone the event did not name, who shares no household with a named person, and who does not live where a public event was made public (`src/director/ledger.ts:1010`).

## Impact: what moves a person

**The rule (measured from the code in pull request 3927, part 2, `src/director/ledger.ts:603`).** At the end of each day the director compares each watched person with how they stood the day before, and reads the day's causes. Those are events that named or reached them, ties that changed, causes that formed or grew, and changes to work, money, home or health. Each change has a raw size on its channel. The raw size is multiplied by the channel's scale and by the person's trait weight for that channel, and the products are added. That sum is the moment's impact. A day with no such change scores zero and stores nothing. A moment's kind is a label made from the channel and the cause, such as `money:job-ended` or `tie:renewed`. Labels are used only to sort moments; no rule reads them.

| Channel | Raw size                                                                                                       | Trait weight                                                         | Scale (ESTIMATED from the stress scale)   |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Feeling | The core's appraised mood change, plus any rise in stress, from an event                                       | None added; the core's appraisal already weighs traits and closeness | 1; the core's feelings use this scale     |
| Tie     | The change in closeness with one person; a first contact after years adds the pair's old thread importance     | Sociability, weight +0.25                                            | "More frequent disputes", 35 points: 0.35 |
| Cause   | A cause forming, or growing stronger                                                                           | None added; the drives package already weighs traits                 | 1                                         |
| Money   | Yearly pay lost or gained as a share of the household's yearly pay; unpaid wages as a share of a month's costs | Risk, weight −0.25, so a person who avoids risk feels a loss more    | "Fired at work", 47 points: 0.47          |
| Home    | A move to another household or place                                                                           | None yet                                                             | "Change in residence", 20 points: 0.20    |
| Health  | The person's own death ends the watched life; illness reaches the feeling channel through its events           | None added                                                           | Read from the event                       |

The scales come from Holmes and Rahe's Social Readjustment Rating Scale of 1967, divided by 100 as the October 8, 2026 design approved. Real data checks totals: a year's moments should rank the way the scale ranks the same changes. No scale row picks an outcome or decides whether something is a moment.

Measured from the code: a trait weight works as the core's own appraisal does (`src/core2/emotion.ts:143`). The recorded trait is divided by the trait scale of 3, multiplied by the channel's weight, and added to 1. An unrecorded trait changes nothing and is never assumed. All weights are tunable, with a check range of −0.5 to 0.5.

**Margaret's job loss (worked by hand, then measured).** Margaret's yearly pay was all of the household's earned pay, so the share lost is 1.00. Margaret's risk trait is −1, so the money weight is 1 + (−1 ÷ 3) × (−0.25) = 1.083. The impact is 0.47 × 1.00 × 1.083 = 0.509. The money channel scores the lost pay, not the empty account. Margaret's cash was already at zero two weeks before the closure. The built director, run over the same year, recorded the same 0.509 for Margaret (see "What the built director recorded", below).

**The classmates (inferred the same way).** Tyler Short's first contact raised closeness by 0.05. They share no earlier moment, so re-entry adds nothing. Margaret's sociability is 0, so the tie weight is 1. The impact is 0.05 × 0.35 × 1 = 0.018, below the floor of 0.11 (answer 1). The thread records that it renewed, so if Tyler later matters, the start of it is there.

**Margaret's year under the floor (inferred).** One moment clears 0.11: the job loss on March 14, at 0.509. The group requests change no channel and score zero. The 3,981 person-days on which one of 21 people was in touch each move closeness by 0.05 or less, at most 0.018 each, so all stay below the floor. Without a floor, each of those person-days would be stored as a moment, about 4,000 in all.

**Importance in hindsight (measured from the code in pull request 3927, `src/director/ledger.ts:560`).** A moment's impact is stored once, when it happens. Each time someone re-enters a life, the director recomputes the hindsight value of every earlier moment that person shared: the stored impact times one plus that person's thread importance now. If Peter later takes office, every moment Margaret shared with Peter rises, back to their partnership.

## Threads, kept facts and fading

**A thread (measured from the code in pull request 3927, `src/director/ledger.ts:247`)** is one watched person's view of one other person. The director stores:

- **closeness**, read from the core's relationship level and faded by the time since the last contact (answer 4);
- **tone**, rising or souring with the sign of the last change;
- **open questions**: kept facts not yet settled, such as a favor owed, a promise or an unanswered request;
- **last contact**, from the core's relationship record;
- **importance**: a standing tie for family and household, plus the pair's moment impacts discounted by fading. The October 8, 2026 calibration sets the ties: a parent or child 0.5, a sibling 0.35, a grandparent 0.2 and a shared home 0.3. Fading discounts moments by up to three quarters. A partner's tie of 0.5, ESTIMATED, was added with the answers in 3930;
- **turns**: started, grew, soured, faded, renewed or closed, each dated when it happens.

Fading is computed when a thread is read, from the last contact and the date, so no daily check runs.

**Kept facts never fade on their own**, as the owner ruled. Four kinds are kept: knew each other, lies, favors and promises. Each kind is a row in the director's data file, so a new kind can be added without changing code.

- **Knew each other**: when and how two people first knew of each other, read from the names each person knows and their recorded past. Margaret's 20 classmates are kept from August 1984. This fact is never removed.
- **Lies, favors and promises**: kept with the person holding each and the fact it concerns. Each ends only when a world event resolves it, and the director records which one. Measured from the code: the new core has no producer for any of the three; its relationship record has an unused promise field (`src/core2/types.ts:166`). Built in pull request 3927, part 2: the story ledger holds the structure for all three. The missing producer is registered as an open stopgap, the core's list of marked placeholders that block release.

**Flashbacks and "meanwhile" scenes** wait until the owner has played the game. Nothing is built on screen for them. Every kept fact and moment holds who knew what, and when, so either can be built later from the ledger.

## Callbacks: how a seed is found

Measured from the code in pull request 3927, with anniversaries added in 3930 (`src/director/ledger.ts:858`).

When a new moment names another person, the director looks the pair up in its index. It links the new moment to the earlier one it echoes, with one of four reasons:

1. **The same people and the same kind of change.** An earlier moment between the pair on the same channel with a similar cause, such as an old argument when a new one starts. The link's strength is the earlier moment's hindsight value.
2. **A kept fact comes due.** A favor is called in when its holder's recorded need is one the other person can meet. A lie is found out on the day the deceived person first learns a fact that contradicts it. Lies are indexed by person and by the fact they deny, so the check is one lookup per learned fact. This ports the old rule that a lie is checked when evidence could first exist (`src/simulation/claim-contradictions.ts:35`). This reason cannot fire in a generated town until the core records favors, lies and promises; a fixture test exercises the lie.
3. **Re-entry after years.** A first contact after a long gap links to the pair's strongest shared moment, or failing that, to the kept fact of how they knew each other. By the rule, Tyler Short's contact would link to Magnolia High School, August 1984. Measured in the year proof: the classmates' contacts stayed under the floor, so no moment and no link were stored; each thread recorded only that it renewed.

4. **An anniversary.** A later moment between two people who went through the same broad event links back to it. The link is strongest on the event's anniversary and weaker further from the date (answer 7).

## Broad events

Measured from the code in pull request 3927 (`src/director/ledger.ts:1063`).

An event is broad when the core makes it public or news: a closure, a storm, a recession, a pandemic or a new law. Every watched person who lived through it gets a background entry: those it named, and those who lived in its town or county when it was made public there. A background entry is not a moment. It sits in the person's journal at its date, in first person, woven with their own moments. The English engine and the journal package (P3) write the words later; the director stores the structure only.

Those it actually hit also get personal moments, sized on their own channels by how it hit them. For the March 14 closure, worked by hand from the rule:

- Margaret was named and lost the job: a background entry and a money moment of 0.509.
- Peter was not named, but Peter shares Margaret's household, so the household's lost pay reaches Peter's money channel. Peter's risk trait is +1, so the weight is 1 + (1 ÷ 3) × (−0.25) = 0.917, and the impact is 0.47 × 1.00 × 0.917 = 0.431.
- A watched La Homa resident with no tie to the store gets only the background entry.

Each broad event keeps the list of watched people it reached and how, so a scene can bring together people who went through it.

## Scheduling: scene now, scene waiting, journal line or nothing

Measured from the code in pull request 3928 (`src/director/scheduling.ts:369`). This is structure only. There are no screens, and the new core is not wired to the game yet.

| Outcome       | When                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Nothing       | Impact below the floor (answer 1). No moment is stored.                                                     |
| Scene now     | Impact at or above the interrupt line (answer 2), and a situation type binds from the records.              |
| Scene waiting | The moment ranks within the life's pace over the trailing year (answer 3), and a situation type binds.      |
| Journal line  | Every other moment, and any moment whose type does not bind; that also writes a coverage row with a reason. |

**Skipped time.** As the owner ruled, while time is being skipped, a moment that would wait as a scene becomes a journal line. A moment at the interrupt line still stops the skip.

**Situation types are human moments only.** Measured from the data: of the 32 types in the October 8, 2026 design, 31 carry over (`src/director/data/situation-types.json`), and a test checks the count. Election night is removed. Its moment is news arriving and a gathering, with the elections engine named as the cause. The door-knocking story flow (pull request 3903) folds into first meeting and visit, with the canvass recorded as the reason the person is at the door. Formal procedures such as council meetings, trials and elections run by their own engine's rules; the director only picks the human moments inside them. Roles are bound from records. For Margaret's closure, news arriving binds Margaret as the one bringing it, because the closure named Margaret. The receiving role takes one person, so it goes to the household member Margaret is closest to; in the year proof that was Ava, 14. Measured in the year proof: Peter, Margaret's partner, and Ava both hold a standing tie of 0.8, but Peter's closeness is 0.462 against Ava's 0.502, because the core recorded no contact between Margaret and Peter all year, one of the core defects below. A player would see the news given to a child rather than the partner until that defect is fixed. The setting is their home.

## Ported and dropped

| Old piece                                        | Kept                                                                                              | Dropped                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Moments (`src/simulation/story/moments.ts`)      | Trait tilt, stakes as a share of household pay, a first contact after years adding old importance | The 17-kind table as a gate; the history cursor; the scan of all pay flows |
| Threads (`src/simulation/story/threads.ts`)      | Ties, the fading discount, turns, importance                                                      | Scheduled fade checks; fading is read when needed                          |
| Situations (`data/content/situation-types.json`) | 31 types as data, with their roles and moves                                                      | Election night as its own type                                             |
| Scheduling (draft pull request 3914)             | Pace ranking over the trailing year, coverage reasons                                             | The old world's binding and history store                                  |
| Callbacks (`src/simulation/life-callbacks.ts`)   | The three questions: can it come back, is someone left to carry it, would anyone notice           | The fixed delays of 96, 187, 251 and 314 days, and the stored sentences    |
| Lies (`src/simulation/claim-contradictions.ts`)  | Check a lie when evidence could first exist                                                       | The old scheduled check                                                    |
| Door-knocking (pull request 3903)                | The canvass as the reason to be at a door                                                         | Its separate story flow                                                    |

## What the built director recorded

Measured in the year proof (built in pull request 3929, rerun in 3930 with the owner's answers applied), on the same town and seed, watching every one of the 10,002 people for 2021, with the drives package's feelings and health installed:

- **Margaret's job loss** was stored at 0.509 and is a scene now: news arriving at home, with Margaret bringing it and Ava receiving it, as the closest household member. It stops a skip.
- **The closure as a broad event** reached all 10,002 watched people: 218 it named, 348 in their households and 9,436 who lived in the town. 564 of the 566 named people and household members stored a personal moment from it, with impacts from 0.157 to 0.509 and a median of 0.47. Not checked: why the other 2 did not. Peter's own moment was not printed in the run's summary, so the 0.431 above is not checked against it.
- **A callback**: Erica Byrd, another La Homa resident, stored a partner's serious illness and then the partner's death; the death links back to the illness, as the same people and the same kind of change.
- **The town's year**: 3,586 moments in 2021, of which 1,096 are scenes now, 2,277 scenes waiting and 213 journal lines, plus 33,247 moments scored from recorded pasts, all journal lines.

## Cost

Measured from the code: the director keeps a ledger only for watched people. Each day it makes one pass over each watched person's ties (`src/director/ledger.ts:603`), and for each event it checks each watched person once, as described above. Measured: by December, Margaret had 24 ties: 20 classmates and 4 family members. The core recorded no tie with any of the store's other 217 workers.

Measured on the cloud machine, one year of La Homa:

- **Two watched lives, with the drives package**: three paired runs, each the same year with and without the director. Pairs 1 and 2 ran on the core at 17548340 with the drives package at 3561aa3d. Pair 3 ran on the core's interface version 7, at 8108737d, with the drives package at 24e74bb3. Inferred: pair 3's year is longer because of the newer core and drives package; the two were not timed apart. With the director the year took 77.6, 74.0 and 88.2 seconds; without it, 79.0, 75.2 and 91.8. Every run with the director was faster than its pair, by 1.2 to 3.6 seconds. Without the director, pairs 1 and 2 ran identical code and still differed by 3.8 seconds, more than any gap between a run and its pair. So the director's added time could not be measured above zero. Heap use was 3.7 to 10.6 MiB higher with the director, against 2,338 to 2,616 MiB used by the year itself.
- **Every person watched, with the drives package**, the run that produced the moments above, on the core at 8108737d: 214.8 seconds, against 91.8 seconds for the same year without the director. That is about 12 milliseconds per watched life per year.
- **Every person watched, without the drives package**, on the core at 17548340: 193.8 seconds and 3,249 MiB of heap. Two runs of the same year without the director took 68.60 and 75.20 seconds and 2,244 and 2,247 MiB. That is about 12 milliseconds and 0.1 MiB of heap per watched life per year.

The speed budget allows a game year at most 20% slower than main. Two watched lives stay inside it. Watching everyone does not, and the director is not meant to.

## What happens next

- **Hooks asked of the core**: the CTO approved both on October 9, 2026 and passed them to SOL-1258, the session that maintains the core. The director edits none of the core's files. First, the appraisal with each event. Measured from the code: the core computes each person's appraisal inside its life module and keeps only the resulting mood and stress (`src/core2/modules/life.ts:319`). Measured from the code: until the core passes it on, the director recomputes it with the core's exported appraisal function, registered as a stopgap. Second, a notice when a tie changes. Measured from the code: ties change without an event, so the director reads them at the end of each day and loses their order within the day (`src/director/ledger.ts:654`).
- **The core's interface version 7**: measured from the code, it asks each module to name the event kinds it hears (`src/core2/types.ts:613`); the director names every kind, from its data file.
- **Found in the core while measuring**: the CTO passed these to SOL-1258 as defects to fix after the finance repair; none of them blocks the director, and watched lives will look wrong until they are fixed. Measured: closeness stops at 0.50. Each contact sets closeness to the hyperbolic tangent of the old closeness plus 0.05, so repeated contact settles at 0.502 and no friendship grows closer (`src/core2/state.ts:579`). Measured: from January 12, each of Margaret's 20 classmates contacted Margaret on 134 to 236 of the 355 days through January 1, 2022, in the run above. Inferred: real adults rarely hear from 20 high school acquaintances that often; no measured contact rate was checked. Measured: Margaret's household had zero cash on the first of every month from May on, and the core records no other income or help for it. Measured: Margaret's partner Peter and the children Alexis and Taylor, who share the household, had no recorded contact with Margaret all year.
- **Found in the year proof, after the CTO's hand-off**: measured, 22 of the town's 39 employers closed in 2021, ending 1,263 of its 1,433 jobs. These closures gave 970 of the 1,096 moments marked to interrupt. The finding is logged for SOL-1258 on this note's pull request, 3926, and needs nothing from the owner. Measured: the opening records 1,433 jobs for 10,002 people, about 1 for every 7. Inferred: across the country about 48 of every 100 residents hold a job, so this looks low; not checked against La Homa's own counts. Not checked: why 5 of the 1,263 workers stored no moment. Inferred: a small share of household pay, under the floor, would explain it.
- **Not checked:** whether the generated names in the family and among the classmates fit La Homa's population or the years the people were born.
- **The five draft pull requests, none merged:** this design note (3926), the story ledger for each watched person (3927), scheduling as structure (3928), the year proof (3929), and the owner's answers applied with a report of one life's year (3930).

## Method

The run behind Margaret's year above was made on October 9, 2026, on the new core's branch at commit 17548340, using its measurement tool in opening mode and a seeded year with finance on. A read-only probe module observed it and changed no core state. The year took 59.5 seconds on the cloud machine. Not checked: why that is shorter than the 68.6 and 75.2 seconds timed on the same core head under Cost; the machine's other load was not recorded. The run and the probe stayed outside the repository. No run was made on the owner's computer.
