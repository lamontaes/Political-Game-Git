# The Journal on the life list

The Journal tells the player's life from the director's moments and from three readers of its own. The person card and the You screen already read one shared list, `lifeOf(core, personId)` in `src/core2/person-life.ts`. This change moves the Journal's life-story entries onto that list and deletes the Journal's own readers for them. The wording stays: the Story line's journal pieces word the entries in the Journal, and the card keeps its own register.

Design record: `docs/design/life-record.md`, point 6 and the table of what it replaces. CTO ruling, November 10, 2026.

## The rule

- **Life story:** the entry is about something that happened in the person's own life, with a `lifeOf` life/what pair that carries the same fact. It is read from the list.
- **A day's happening:** a scene, a talk, a promise, news read, an act in office, a law that reached them. Only the Journal tells these. They stay as they are.
- **Someone else's event:** a relative's move, a relative's filing. It is not on the player's list, so the director's moment tells it as before.
- **The player's own move** is told as the `moved` row on the day of the list's move-away event; a relative's move is not on the player's list and stays the director's moment.
- **The director's moment** keeps one job for a life-story entry: how much it weighed (hindsight, who else was in it). It no longer decides whether the entry exists.

## Every kind of entry, and where it reads from

| Entry (row kind)                                                                                                | Read today from                                            | Kind                       | `lifeOf` pair (life/what)                                |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| `job-started:first`, `job-started:again`                                                                        | `pastWorkMoments`, past work records                       | life story                 | work/job-started (person.work-spell)                     |
| `job-ended:let-go`, `moved-on`, `child`, `retired`                                                              | `pastWorkMoments`, past work records                       | life story                 | work/job-started, work/job-ended                         |
| `job-ended` (a job lost in play)                                                                                | director moment, state change in pay                       | life story                 | work/job-lost                                            |
| `household:partners-met`                                                                                        | `householdMoments`, partnership record                     | life story                 | partner/partnered                                        |
| `moved` (came to the county)                                                                                    | `householdMoments`, moves record                           | life story                 | move/moved-in                                            |
| `household:school-started:elementary`, `:high`                                                                  | `householdMoments`, school records                         | life story                 | school/started                                           |
| `family:child`                                                                                                  | director moment on a built family fact                     | life story                 | child/born                                               |
| `event:person-birth`                                                                                            | director moment on the birth record                        | life story                 | child/born                                               |
| `event:person.moved-away`                                                                                       | director moment on the moves record                        | life story                 | move/moved-away                                          |
| `event:life.death`                                                                                              | director moment on the death record                        | life story                 | loss/died                                                |
| `event:health.serious-illness`                                                                                  | director moment on the health record                       | life story                 | health/serious-illness                                   |
| `event:housing.eviction`, `event:housing.purchase`                                                              | director moment on the housing record                      | life story                 | home/evicted, home/bought                                |
| `event:organization.founded`                                                                                    | director moment on the organization record                 | life story                 | business/founded                                         |
| `event:candidate-filed`, `event:election-result`, `event:took-office`                                           | director moment on the elections record                    | life story                 | politics/filed, won, lost, took-office                   |
| `person.birth` (where I was born)                                                                               | `householdMoments`, birth record                           | life story                 | born/born (one history row for the birth record's place) |
| `household:raised-by`, `parent-apart`, `sibling*`, `siblings*`                                                  | `householdMoments`, family facts                           | life story                 | none (a gap)                                             |
| `household:parents-met:*`                                                                                       | `householdMoments`, parents' partnership record            | life story                 | none (a gap: another person's record)                    |
| `household:moment:parent-new-job`                                                                               | `householdMoments`, a parent's past work                   | life story                 | none (a gap: another person's record)                    |
| `event:school.finished`                                                                                         | `schoolFinishedMoments`, the school engine's results table | life story                 | none (a gap: a table row, not a record on the list)      |
| `household:livelihood`                                                                                          | `householdMoments`, what each earner holds now             | a standing fact            | not an event                                             |
| `life:came-of-age`                                                                                              | `comingOfAgeMoments`, the date of birth                    | day's happening            | not an event                                             |
| Scenes, office acts, laws learned, news, volunteer shifts, petitions, unpaid wages, the school and job settings | scenes, office acts, the director                          | day's happening or setting | stay                                                     |

## Counts

Of the 65 rows in `journal-rows.json`:

- **23 move** to the list: the work, partner, move, school, child, loss, health, home, business, politics and birth rows. One row is added to `remembered.json` for them: `person.birth` (the birth record, with its place), a record the past passes already write.
- **12 are gaps** (life story, no pair), in 4 groups: who raised the person and their brothers and sisters (7 rows), the parents' own records (3 rows, one made in play), a parent's new job (1) and the school year's end (1). Each stays on its old reader, registered as the director stopgap `SG-DIRECTOR-journal-life-gaps`, which names the missing pair. No engine writes these as remembered events.
- **30 stay** as a day's happening or setting (scenes, acts, laws, news, the household's standing livelihood, the day of turning eighteen).

## What a moved entry reads

The list gives the fact, the date and the record ids. The entry's words come from the Journal's own bank pieces (`data/english/parts/journal.json`), unchanged. Where the Journal has no piece for a pair, the card's first-person piece in `data/english/parts/person-history.json` words it. The card keeps its own words for the same fact: one fact, one record, two registers.

## How it is checked

`src/director/journal-life-list.test.ts` plays a drawn place for 200 days and collects every life-story entry (kind, records, date, sentence) for the player and two household members. It compares them with the entries saved before the change, and brings about a job lost, a move and a death through the records the engines write.
