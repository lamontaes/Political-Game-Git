# The story director reads the new core: what moves a person becomes a moment

The owner has seven choices to make before the director's numbers are final; each is below with a recommendation. Until then, the parts the owner's October 9, 2026 answers already settle are being built, with each open number marked tunable. This note plans the director on the new core. It reads what the core records about a watched person: feelings, ties, causes, money, home and health. A change on any of them becomes a moment, sized by the person's own traits, with no list of kinds. In the test town, a cashier losing her household's only pay to a store closure is the strongest moment of her year. Twenty old classmates getting in touch barely registers.

## Questions for the owner

The owner's answers change only the tunable numbers named in each question. Everything else in this note is settled by the owner's October 9, 2026 answers and is being built now.

1. **How big must a change be to count as a moment?** Recommended: the smallest life change on the Holmes and Rahe stress scale the old director used. That is "minor violations of the law", 11 points, or 0.11 on the director's scale. A smaller change still moves the person's thread with the other person, so nothing is lost; it is just not stored as a moment. Without a floor, every routine visit is a moment. Margaret, below, would hold about 4,000 by December.
2. **Where is the line that takes over the screen?** Recommended: the scale's value for the death of a close family member, 63 points or 0.63, applied to the person's own trait-weighted impact. A death or a disaster interrupts play. Margaret's job loss, at 0.509, waits as a scene she can go to.
3. **Does the pace rule still decide which moments wait as scenes?** The October 8, 2026 rule allows about 1 scene a year up to age 7, 2 from 8 to 12, 3 from 13 to 17 and 4 for an adult. It ranks moments over the trailing year. Recommended: yes. Moments that rank within the pace wait as scenes; the rest become journal lines.
4. **How fast does closeness fade without contact?** Recommended: friends lose half their closeness in about 18 months without contact, and relatives in about 36 months. This is an estimate from Roberts and Dunbar's 2015 study of how friendships and family ties decay, labeled ESTIMATED. The owner has already ruled that the fact two people knew each other never fades.
5. **How are the years before the game starts scored?** The new core gives each person a recorded past: children's births, a partner, school years, a first job, and dated public events such as the September 2001 attacks, the 2008 recession and the 2020 pandemic. Recommended: personal past facts become moments with an impact estimated from the stress scale, labeled ESTIMATED. Public events become background entries only, because the core records no personal exposure to them.
6. **Should watching a person change how closely the core simulates them?** Measured from the code: the core gives daily detail to the player, the player's family, household, known people and coworkers, and anyone named in a focus list (`src/core2/focus.ts:4`, `src/core2/calendar.ts:77`); everyone else acts weekly. Recommended: the director watches without asking for more detail, so being watched never changes what happens to a person.
7. **How close to an anniversary does a shared event come back?** The owner asked for "the flood on its anniversary." Recommended: a weight highest on the date that falls smoothly over two weeks either side, with no cut-off. Until this is answered, the director keeps event dates and builds no anniversary recall.

## The test town

Measured: the new core's own measurement tool built La Homa, Texas, in Hidalgo County: 10,002 people from the seed `p8-real-life-cost-2026-10-09`, opening January 1, 2021. It is the same town and seed the core's finance year uses. The tool chose the watched person by a hash of the seed among recorded workers.

**Margaret Harrell**, 51, is a cashier at Hidalgo County Mercantile, paid $58.63 for each day she works, which averages $34.26 a calendar day. Her husband Peter, 57, has no recorded job, so her pay is the household's only earned income. Their children are Ava, 14, Alexis, 13, and Taylor, 10. Her recorded traits are reliable, duty-bound, generous and contented, and she avoids risk and conflict. Her recorded past holds Laurel Hill Elementary from 1975, Laurel Hill Middle from 1981, Magnolia High School from August 1984, her three children's births, and Peter as her partner since 1994. Twenty people who started at Magnolia High with her in August 1984 are recorded as people she remembers by name. None has any closeness or contact on record.

Feelings and closeness in the core run from −1 to 1, with 0 meaning nothing recorded. What Margaret's year held, measured from one run of the core with finance on, January 1, 2021 to January 1, 2022:

- **The first week:** nothing touched her. No event named her, no tie changed, and her pay arrived on schedule. Her stress rose from 0.195 to 0.219 as it drifted toward the model's resting level, which is not a cause.
- **January 10 and 11:** she asked to join two local groups, recorded as one event each.
- **January 12:** a classmate, Tyler Short, contacted her for the first time on record, and their closeness rose from 0 to 0.05. By January 13, all 20 classmates had been in touch. Each of them contacted her on 134 to 236 of the 355 days from January 12, 2021 through January 1, 2022. Each pair's closeness settled at 0.50.
- **March 1:** after the month's living costs were taken, her cash was $0. Her pay does not cover the household's recorded costs.
- **March 14:** Hidalgo County Mercantile closed because it could not pay its wages. The closure ended 218 jobs, hers among them. The core recorded it as a public event naming every worker, with no feeling attached, so her mood and stress did not move.
- **The rest of the year:** her cash was $0 on the first of every month from May 2021 through January 2022. No other income is on record. Not checked: how the core divides the monthly costs between Margaret and Peter. Her mood was 0 all year, because no event in this core carries a feeling for her.

On the 365 simulated days from January 2, 2021 through January 1, 2022, her free-time choice was rest on 355, looking up a local office on 7, asking to join a group on 2, and contacting someone on 1. Her husband Peter and her children Alexis and Taylor have family ties from the start of the run, and the core recorded no contact with any of them all year. Her daughter Ava was in touch on 29 days.

The records hold a lost livelihood, a family with no earner, 20 old classmates and a public closure. Her feelings show none of it. The director has to read the money, the ties and the event, not the feelings alone.

## Where the director lives

Planned: the director is a read-only module in a new folder, `src/director/`. A program installs it beside the core's own modules when it creates the core. Measured from the code: the core's creation function already accepts extra modules (`src/core2/life.ts:35`). It receives each event as it happens, with the people who learned it. It looks at each watched person at the end of the day, after the core's own modules have run (`src/core2/life.ts:305`). It calls no writer and adds no story logic to the core. A test will run the same seeded town with and without the director and require the core's records to come out identical.

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

Watched people are the player, anyone the player clicks into, and lives replayed by the life-replay harness (P9), as the owner ruled. A host program passes the list; the director does nothing for anyone else. It skips an event in one lookup when the event names no watched person and was not made public in a watched person's town or county.

## Impact: what moves a person

**The rule (planned).** At the end of each day the director compares each watched person with how they stood the day before, and reads the day's causes. Those are events that named or reached them, ties that changed, causes that formed or grew, and changes to work, money, home or health. Each change has a raw size on its channel. The raw size is multiplied by the channel's scale and by the person's trait weight for that channel, and the products are added. That sum is the moment's impact. A day with no such change scores zero and stores nothing. A moment's kind is a label made from the channel and the cause, such as `money:job-ended` or `tie:renewed`. Labels sort moments and decide nothing.

| Channel | Raw size                                                                                                       | Trait weight                                                         | Scale (ESTIMATED from the stress scale)   |
| ------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Feeling | The core's appraised mood change, plus any rise in stress, from an event                                       | None added; the core's appraisal already weighs traits and closeness | 1; the core's feelings use this scale     |
| Tie     | The change in closeness with one person; a first contact after years adds the pair's old thread importance     | Sociability, weight +0.25                                            | "More frequent disputes", 35 points: 0.35 |
| Cause   | A cause forming, or growing stronger                                                                           | None added; the drives package already weighs traits                 | 1                                         |
| Money   | Yearly pay lost or gained as a share of the household's yearly pay; unpaid wages as a share of a month's costs | Risk, weight −0.25, so a person who avoids risk feels a loss more    | "Fired at work", 47 points: 0.47          |
| Home    | A move to another household or place                                                                           | None yet                                                             | "Change in residence", 20 points: 0.20    |
| Health  | The person's own death ends the watched life; illness reaches the feeling channel through its events           | None added                                                           | Read from the event                       |

The scales come from Holmes and Rahe's Social Readjustment Rating Scale of 1967, divided by 100 as the October 8, 2026 design approved. Real data checks totals: a year's moments should rank the way the scale ranks the same changes. No scale row picks an outcome or decides whether something is a moment.

A trait weight works as the core's own appraisal does (`src/core2/emotion.ts:143`). The recorded trait is divided by the trait scale of 3, multiplied by the channel's weight, and added to 1. An unrecorded trait changes nothing and is never assumed. All weights are tunable, with a check range of −0.5 to 0.5.

**Margaret's job loss (inferred by applying the rule to the measured records).** Her yearly pay was all of the household's earned pay, so the share lost is 1.00. Her risk trait is −1, so her money weight is 1 + (−1 ÷ 3) × (−0.25) = 1.083. Her impact is 0.47 × 1.00 × 1.083 = 0.509. The money channel scores the lost pay, not the empty account. Her cash was already at zero two weeks before the closure.

**The classmates (inferred the same way).** Tyler Short's first contact raised closeness by 0.05. They share no earlier moment, so re-entry adds nothing. Margaret's sociability is 0, so her tie weight is 1. The impact is 0.05 × 0.35 × 1 = 0.018, below the recommended floor in question 1. The thread records that it renewed, so if Tyler later matters, the start of it is there.

**Margaret's year under the recommended floor (inferred).** One moment clears 0.11: the job loss on March 14, at 0.509. The group requests change no channel and score zero. The 3,981 person-days on which one of 21 people was in touch each move closeness by 0.05 or less, at most 0.018 each, so all stay below the floor. Without a floor, each of those person-days would be stored as a moment, about 4,000 in all.

**Importance in hindsight (planned).** A moment's impact is stored once, when it happens. Each time someone re-enters a life, the director recomputes the hindsight value of every earlier moment that person shared: the stored impact times one plus that person's thread importance now. Nothing predicts who will matter. If a classmate becomes mayor in 2040, every moment Margaret shared with them rises, back to 1984.

## Threads, kept facts and fading

**A thread (planned)** is one watched person's view of one other person. The director stores:

- **closeness**, read from the core's relationship level and faded by the time since the last contact (question 4);
- **tone**, rising or souring with the sign of the last change;
- **open questions**: kept facts not yet settled, such as a favor owed, a promise or an unanswered request;
- **last contact**, from the core's relationship record;
- **importance**: a standing tie for family and household, plus the pair's moment impacts discounted by fading. The ties and discount are the October 8, 2026 calibration: a parent or child 0.5, a sibling 0.35, a grandparent 0.2, a shared home 0.3, and fading discounting moments by up to three quarters;
- **turns**: started, grew, soured, faded, renewed or closed, each dated when it happens.

Fading is computed when a thread is read, from the last contact and the date, so no daily check runs.

**Kept facts never fade on their own**, as the owner ruled. Four kinds are kept, each an open data row:

- **Knew each other**: when and how two people first knew of each other, read from the names each person knows and their recorded past. Margaret's 20 classmates are kept from August 1984. This fact is never removed.
- **Lies, favors and promises**: kept with the person holding each and the fact it concerns. Each ends only when a world event resolves it, and the director records which one. Measured from the code: the new core has no producer for any of the three; its relationship record has an unused promise field (`src/core2/types.ts:166`). Planned: the story ledger, the next piece of this package, holds the structure for all three. The missing producer is registered as an open stopgap, the core's list of marked placeholders that block release.

**Flashbacks and "meanwhile" scenes** wait until the owner has played the game. Nothing is built on screen for them. Every kept fact and moment holds who knew what, and when, so either can be built later from the ledger.

## Callbacks: how a seed is found (planned)

When a new moment names another person, the director looks the pair up in its index. It links the new moment to the earlier one it echoes, with one of three reasons:

1. **The same people and the same kind of change.** An earlier moment between the pair on the same channel with a similar cause, such as an old argument when a new one starts. The link's strength is the earlier moment's hindsight value.
2. **A kept fact comes due.** A favor is called in when its holder's recorded need is one the other person can meet. A lie is found out on the day the deceived person first learns a fact that contradicts it. Lies are indexed by person and by the fact they deny, so the check is one lookup per learned fact. This ports the old rule that a lie is checked when evidence could first exist (`src/simulation/claim-contradictions.ts:35`).
3. **Re-entry after years.** A first contact after a long gap links to the pair's strongest shared moment, or failing that, to the kept fact of how they knew each other. Tyler Short's contact links to Magnolia High School, August 1984.

Anniversary recall (question 7) is not built.

## Broad events (planned)

An event is broad when the core makes it public or news: a closure, a storm, a recession, a pandemic or a new law. Every watched person who lived through it gets a background entry: those it named, and those who lived in its town or county when it was made public there. A background entry is not a moment. It sits in the person's journal at its date, in first person, woven with their own moments. The English engine and the journal package (P3) write the words later; the director stores the structure only.

Those it actually hit also get personal moments, sized on their own channels by how it hit them. For the March 14 closure (inferred by applying the rule):

- Margaret was named and lost her job: a background entry and a money moment of 0.509.
- Peter was not named, but he shares her household, so the household's lost pay reaches his money channel. His risk trait is +1, so his weight is 1 + (1 ÷ 3) × (−0.25) = 0.917, and his impact is 0.47 × 1.00 × 0.917 = 0.431.
- A watched La Homa resident with no tie to the store gets only the background entry.

Each broad event keeps the list of watched people it reached and how, so a scene can bring together people who went through it.

## Scheduling: scene now, scene waiting, journal line or nothing (planned)

This is structure only. There are no screens, and the new core is not wired to the game yet.

| Outcome       | When                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Nothing       | Impact below the floor (question 1). No moment is stored.                                                   |
| Scene now     | Impact at or above the interrupt line (question 2), and a situation type binds from the records.            |
| Scene waiting | The moment ranks within the life's pace over the trailing year (question 3), and a situation type binds.    |
| Journal line  | Every other moment, and any moment whose type does not bind; that also writes a coverage row with a reason. |

**Skipped time.** As the owner ruled, while time is being skipped, a moment that would wait as a scene becomes a journal line. A moment at the interrupt line still stops the skip.

**Situation types are human moments only.** Of the 32 types in the October 8, 2026 design, 31 carry over as data. Election night is removed. Its moment is news arriving and a gathering, with the elections engine named as the cause. The door-knocking story flow (pull request 3903) folds into first meeting and visit, with the canvass recorded as the reason the person is at the door. Formal procedures such as council meetings, trials and elections run by their own engine's rules; the director only picks the human moments inside them. Roles are bound from records. For Margaret's closure, news arriving binds Margaret as the one bringing it, because the closure named her. The household record gives the members who receive it, and the setting is their home.

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

## Cost

The director runs only for watched people. Its daily work is one pass over each watched person's ties, plus the events that name them. By December, Margaret had 24 ties: her 20 classmates and her 4 family members. Each pull request in this package will report the added time and memory per watched life against the same seeded year without the director.

## What happens next

- **Hooks asked of the core** go to SOL-1258, who owns it; the director edits none of the core's files. First, the appraisal with each event. Measured from the code: the core computes each person's appraisal inside its life module and keeps only the resulting mood and stress (`src/core2/modules/life.ts:319`). Until the core passes it on, the director recomputes it with the core's exported appraisal function, registered as a stopgap. Second, a notice when a tie changes. Ties change without an event (`src/core2/state.ts:561`), so the director reads them at the end of each day and loses their order within the day.
- **Found in the core while measuring**, for SOL-1258; none of these four blocks the director. Measured: closeness stops at 0.50. Each contact sets closeness to the hyperbolic tangent of the old closeness plus 0.05, so repeated contact settles at 0.502 and no friendship grows closer (`src/core2/state.ts:579`). Measured: from January 12, each of Margaret's 20 classmates contacted her on 134 to 236 of the 355 days through January 1, 2022, in the run above. Real adults do not hear from 20 high school acquaintances that often. Measured: Margaret's household had zero cash on the first of every month from May on, and the core records no other income or help for it. Measured: her husband Peter and her children Alexis and Taylor, who share her household, had no recorded contact with her all year.
- **Not checked:** whether the generated names in the family and among the classmates fit La Homa's population.
- **Next in this package:** the story ledger for each watched person, then scheduling as structure, then a year proof in this town with two watched lives, a callback and the closure as a broad event, then a report of one life's year.

## Method

The run was made on October 9, 2026, on the new core's branch at commit 17548340, using its measurement tool in opening mode and a seeded year with finance on. A read-only probe module observed it and changed no core state. The year took 59.5 seconds on the cloud machine. The run and the probe stayed outside the repository. No run was made on the owner's computer.
