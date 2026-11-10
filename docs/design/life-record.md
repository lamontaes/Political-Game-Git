# The life record

Each person you open keeps one short list of what they went through: who, what, when and what it changed. The engines that already run write it as things happen, and a coarse past fills in the years before the game began, back to that person's own birth. The journal, the person card and the You screen all read that one list, so the same event reads the same everywhere. Today three screens each build their own partial history, and none of them shows what happened in play.

## Where this comes from

Design by Fable, November 10, 2026, for pool item `core-life-record`. It answers root cause 3 of the audit (`docs/audits/fable-vision-2026-11-09.md` on branch `audit/fable-vision`).

## What you ruled

- October 14: "History does not start on the day the player generates in."
- October 28: "You should be able to click on people and then view that person... But again, it doesn't have any history."
- October 28: "Yes, simulate to the birth year. Remember, it doesn't have to be any kind of depth. It's just got to be general to make the game flow."
- November 1: "EVERY. LIFE. IS. SIMULATED."
- November 8: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever."
- October 11: memories keep what matters and summarize the rest.
- November 10, in Fable's session: each person's past covers their own whole life, coarse, a year at a time, written only when you open or meet them. The world's own history (laws, elections, the economy) still starts in your character's birth year.

## What the game does today

Read in the code on November 10:

- **Three screens tell a life three ways.**
  - The Journal builds its own list from the director's moments, family facts and past jobs.
  - The person card builds another from family facts, schools and past jobs. It reads nothing that happened in play: no illness, no move, no divorce, no job lost.
  - The You screen shows no history at all.
- **The past stops at your birth year, for everyone.** A neighbor of 70 has no school record and no job before the year your character was born. The code clips every person's past to that year.
- **Only four kinds of past become memories.** A child born, a partner, a school started, a job started. Nothing else that happened between people is scored.
- **Much of what happens in play is recorded and then never told.** The engines already write all of these:
  - work: a job lost;
  - home: a move, a home bought, an eviction, a home damaged by a disaster;
  - family: an engagement, a marriage, a separation, a birth, a death;
  - health and the law: a serious illness, a crime against someone, a charge, a conviction, a release;
  - politics and business: a filing for office, an election result, taking office, a business founded or closed.
- **A private event is kept only for your circle.** The log keeps an event if it is public, news, or about someone you deal with. So a stranger's illness leaves no trace to find when you later meet them.
- **Some things have no record at all:** an injury or a hospital stay, an arrest, a car or other big purchase, a promotion, and losing an election (only the winner is recorded).

Measured in the audit: a 17-year-old's life was four lines. Of 117 adults in one town, 115 had a job record, 44 a family record, 21 a school record and one a move.

## The design in one page

**1. One list on each full person.** A remembered event holds:

- the record that caused it, by id;
- its date and its kind (work, school, a move, a partner, a child, a loss, health, the law, a home, a business, politics);
- who else it names, and the place;
- an amount, where there is one;
- what it changed, in the record's own fields (the job, the home, the partner, the office).

It holds no sentence. The words come from the banks when a screen shows it.

**2. Engines write it as things happen.** When an engine records one of the events listed above, each person the record names gets it on their list, whether or not you know them yet. A table says which record kinds a person remembers and what kind of life event each is. No engine changes what it does. This adds one small write where the record is made.

**3. The list stays short.** A person keeps the events that mattered most to them, by the director's own measure of impact, and the rest fold into a yearly summary ("worked at the mill for nine years"). That is your October 11 rule, and it keeps a long game from growing.

**4. The past reaches back to each person's own birth.** When you open or meet someone, the past passes run over their whole life. Those passes already write school, work, moves and partners. They step a year at a time before your character's birth year and by the quarter after it. The clip to your birth year is removed for a person's own records. The world's own history does not move: laws, elections and the economy still begin in your birth year.

**5. The gaps between people are filled from records that exist.**

- A former partner: the partnership records already keep a start and an end.
- A health event: the health record a person is given when filled in has a start date.
- A loss: a parent's, partner's or child's death, from the death record. Deaths before the year before the start are not kept today, so the kin pass keeps each death's date.
- A win or a loss in politics: each candidate gets the result, not only the winner.
- A promotion: a job whose pay record rose at the same employer.

**6. Three screens, one reader.** One function returns a person's life in order. The Journal's "before" chapters, the card's Life story and a new My life section on the You screen all call it. Each screen's own assembly is deleted. One bank words every event, in the first person for your journal, the second for the You screen and the third for someone else's card. The facts are the same on all three.

**7. Scenes can cite it.** A remembered event is a record, so a scene's cause can match it. The first scenes to use it are talks that bring up something the two people share, such as a job at the same firm or a loss in the family.

**8. Two tiers, one rule.** A counted person has no list until filled in. The list built at fill-in agrees with what the counts already say about them: their age, job, pay, household and place. Someone who goes back to the counts keeps their list, so they are the same person when you meet them again.

## What stays out

- **An injury, a hospital stay, an arrest, a car.** No engine records these today. Each is a pool item for the engine that would write it, and the life record picks them up when it does. This design adds no new engine.
- **A full past for everyone.** Nobody gets a list until you open or meet them.
- **The fading memory dev mode shows.** That list is what someone heard or saw lately, and it fades in two weeks. It stays as it is and is not the life record.

## What is deleted

| Deleted                                                    | Replaced by                                          |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| The card's own history assembly                            | The one reader                                       |
| The Journal's own assembly of family and past work         | The one reader                                       |
| The clip of every person's past to the player's birth year | A person's own records reach back to their own birth |
| The table of four past kinds that become memories          | The table of remembered kinds                        |
| Card history kinds that nothing writes                     | Nothing                                              |

## The order of the work

Each step is its own pull request, checked by a second session in the running game.

1. **The list and the one reader.** The remembered-event list, the table of kinds, the write where each record is made, and the reader. The card, the Journal and the You screen read it. Their own assemblies are deleted.
2. **The whole-life past.** The past passes run over each opened person's own life.
3. **The gaps between people.** Former partners, health, losses, each candidate's result, promotions.
4. **Scenes.** Talks that cite a remembered event.

## How a second session checks it

- **Three screens.** Start a new game on main in a drawn place, as a character of 35 or older. Open the You screen, the Journal and the card of the oldest person in the household. Each shows at least six remembered events of different kinds. Each is a sentence that names a person, a place or an amount. Trace on each opens the record that wrote it. The same event reads the same on all three.
- **An older neighbor.** In Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, open an adult born before 1980. Their life shows events from before your character's birth year.
- **Play.** Play a year. Something that happened to a household member in that year is on their card, by record id.
- **A scene.** A scene in the first played year cites one remembered event by record id.

## Risks, and how each is held

- **Size.** A list on every full person grows with the game. It is capped, the rest folds into summaries, and the speed check measures a long save before and after.
- **A past that contradicts the counts.** A filled-in person's past must end in the job, pay, home and household the counts already give them. The past passes already work backward from the opening as it stands, and the test checks it for people of every age.
- **Lines that sound alike.** Every sentence comes from the banks and passes the words machine's rules.
- **Two memories.** The director already keeps moments for people it watches. The list here is what those moments are built from, not a second copy: the director's past moments read it.
