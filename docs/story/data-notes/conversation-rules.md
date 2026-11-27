# Notes that were in src/director/data/conversation-rules.json

Moved out of the game's data on Nov 27, 2026 (CTO's story audit, row C9), word for word. The data keeps what the game reads.

## `about`

How conversations run on the new core: the events they record, how many choices the player gets, and which subject a reply or a raised subject is worded under. No sentence text: every line is a mined sentence from data/english/parts/conversation.json.

## `sharedPast.about`

Owner, Oct 15, evening (batch 12 rejected): nobody opens a talk with 'Do you remember <school>?' or 'Did you work at <employer>?'. A shared school or workplace is raised only when something recorded happened to it (not built yet) or when this many years have passed since, so the question has a reason. The record supplies the fact long-ago; the parts need it.

## `topicOfLabel.about`

A recorded moment of the speaker's own (no one else in it) is talked about as this subject, by the moment's label: a new job is their work, a move is their home.

## `addressPoint.about`

Owner, Nov 11, 2026: the relative raises a real thing the President said in the address and where they stand on it from their own life. Which of the address's points a hearer raises reads these lists: a point on work or pay (by the bill catalog's subject) for someone who lost a job this year or is looking for one, a point on prices, rent or housing (the catalog's subjects, and the questions about prices by name) for someone money is hard for. `back` is the subject the hearer's answer to the player's reply is composed under. Names only; no sentence.

## `addressPoint.claims.about`

What each claim about the country's year is about and which way it says things went. A hearer stands on a year point by whether their own life bears it out: a claim that work got worse is borne out by a job lost or looked for, or the town's unemployment above the country's; a claim that money got worse by hardship, an eviction, or the town's rent above the burden line; a claim that things got better by the opposite. By claim fact; no sentence.

## `greetAndPart.about`

Owner, Nov 11, 2026: every line through the English engine, with inserts from the world's records. A greeting away from home is composed under `greet` from a plain opener and a core that names the listener or when the two last met; a goodbye under `farewell` from a core that names what the talk was about or someone of the player's they know, and a short closer. `aboutFacts` lists, in order, the facts of the talk's first topic a goodbye may name as {about-said}; the first the topic carries is said, with the mark `about-<fact>` so its wordings fit it. Names only; no sentence.

## `knownByAct.about`

Account lead, Nov 15 (#9489, point 3): someone who knows the other only from an act on the public record between them (a veto or signing of their bill, an appointment) knows who they are without having spent time together. The greeting's introduction then takes the stage `stage` instead of a stranger's, with the mark `act-<what>` (from `said`) and a second mark saying whose act it was: `act-mine` when the listener did it to the speaker (the speaker's bill, the speaker's appointment), `act-theirs` when the speaker did it (Words lead, Nov 15). The mark `known` holds back every stranger's answer and welcome ("Good to meet you", "now we've met"). One row for every act made apart: a record of one of these kinds that names both people. A veto writes no shared time; a signing does (world-legislating.ts executiveHours), so a signed bill's sponsor is met, not only known.

## `metThroughPast.about`

Account lead, Nov 15 (item people-schoolmates-meet-as-strangers, evidence from the second reader at Dortches): two people the records put in the same school year or on the same campaign spent time together, however long ago, so neither introduces themselves as to a stranger; the shared-school subject is how they place each other. Kinds are sharedHistory's (src/core2/shared-history.ts). Not `coworker`: that row says only that both are or were paid by one employer, which for a state or a large firm holds thousands who never met (a governor and every legislator are the state's).

## `familyTalk.about`

Owner, Oct 15, evening (batch 11 grading): a family talk is a personal scene only, since the family has little involvement in play for now. Between relatives, work, school, where each is from and mutual acquaintances are not talked about ('Where do you work' between relatives is not a scene; neither is 'Have you talked to Diana?'). These are the subject kinds a relative does not raise or ask; what is left is the household's own news (a lost job, an eviction), kin, and news passed on.

## `familyNews.about`

Owner, Nov 1, 2026: every life is simulated, at low intensity, and under Q7 what happened to a relative is the news. Asked after a relative, the answer's stage is their latest recorded happening, by the moment's label (by prefix): ill, moved, a new job, a new baby. Anything else is the default stage. Each news line cites the record it tells.

## `happenings.about`

Owner, Oct 14, 2026, night (Q7): someone not in the room is talked about only when something recorded happened to them. These are the ledger labels (by prefix) that are something happening to a person: their money and work, their home, their health, a birth or death, the law catching them, a move, an election they ran in. Reading the news, hearing a speech or being told of a cause happened in front of them, not to them.

## `smallTalk.about`

Words composer, unit 2 (owner, Nov 12: the 7:00 a.m. work talk every morning for four weeks). Small talk (the day itself, with nothing but the clock behind it) ranks below every subject with a record, and once raised with a person it is not raised with them again for this many days.

## `dayTalk.about`

Words composer, talk on ordinary days (owner, Nov 12: "the game says nothing at home, and what it says is the same sentence from everyone"). Subjects of a person's own day, each from its engine's record (the work-spans engine's shift: the day ahead or a day off for work-day, the shift just worked for work-done): told to someone they live with, answered by the player's reply, and answered back in composed words under `<kind>-back` by the reply's move, so no talk ends on the player's line. Once told to a person, a day subject waits this many days before it is told to them again; the day's own facts (when the shift starts, how long it ran) are new each day. The rent coming due (rent-due) is told by a payer on the household's lease in the days before it is due, once for each due date, and answered from the household's cash against it. A school day missed (school-missed) is read the next morning from the school engine's closed day: a school day with no attendance row; a day they went is the usual day and no news. A morning shift is told only when it differs from the job's usual day (its hours by unusualShiftMinutes); a usual day or a day off is no news. A story in the paper that names the speaker's own employer or someone they know (news-touch) is told once, by the story's own record. A household put out of its home (eviction) is told once by an adult of it, from the housing engine's case and status: when, what was owed and how many months of rent that was, a job the teller lost before it, and where they went (a relative's, a shelter bed, nowhere); answered back by the reply's move from the same records. For the kinds the arcs file names under home.dayBack.omitsTold, the answer back leaves out the figures the telling just said, so it says what comes next, never the same figure again. A relative's death, serious illness or prison term (death-news, illness-news, prison-news) is told once by someone the player lives with, from the record it cites: when, the age at death and a cause said plainly, the illness's common name, the term's length. A housemate's charge, conviction or acquittal (charge, conviction, acquittal) is told through `<kind>-say` from the justice engine's case, pretrial and sentence records (the offense from the defendant's own side, a plea or the trial day, bail, the prison term, fine or probation); the kinds in answersBack (charge-reply, conviction-reply, acquittal-reply) are answered back in composed words from what the telling left out. A job lost (job-lost) is told once by the person who lost it, from the ended job's record, their working life's start, and the search record's reason and search; answered back by the reply's move from the same records.

## `stands.about`

Owner, Nov 12, via the coordinator: children do not take stands on the President's address. A person younger than this takes no stand in talk: no point of an address, no stand of their own, no policy story told with a side; a child talks about school, friends and home.

## `stands.reasonFits.about`

Lead, Nov 12 ("At about $15 an hour, it's my own paycheck on the line" from someone against a raise that would pay her more): a reason from the speaker's own life is offered only when the record supports the side taken, by question and side. `pay-near`: their hourly pay is at or under the proposed wage times payNear. `payroll`: they hold a job whose title names someone who sets pay (payrollTitles). `worker`: they hold a job and do not set pay. `hardship`: the trait engine's hardship stress is past zero. A side not listed has no reason from their life; they say the principle. Question ids and fit names only.

## `stands.reasonFits.wages.about`

The proposed wage each question would set, in cents an hour (the job record's minor units).

## `playerNews.about`

Words composer (lead, Nov 12: the people at home talk most about the person in front of them). A housemate brings up the player's own recorded news from the player's ledger moment, by the moment's cause kind: they know it because they live with the player (the household) or read it (a printed story naming the player). Each is said with the housemate's own stance on it, from their tie to the player and their traits (no dice). A moment a scene already played is heard (noteSceneHeard) and not brought up again. Names, marks and numbers only; no sentence.

## `playerNews.stances.about`

The stance a housemate takes on the player's news, by their tie to the player (the relation the player's family record names; anyone else at home is `other`) and by whether the news is good, a loss, or civic (a race, a vote, a bill): `riskLow` is said by someone whose risk trait is under riskBelow (they worry), `riskHigh` by the rest. A civic stance gives way to `other-side` when the speaker's lean and the player's party lean differ by sides (otherSideLean).

## `governmentNews.about`

Words composer (owner's golden path: "the town visibly changes, people bring it up"; lead, Nov 12). What a government did, brought up at home by a housemate with a source on record for it: an address they heard (any level's head of government, by the office that gave it, said by role), a local budget line or ordinance that carried, from the story they read (their news.read record), or a town hall they attended (its record names them). With the question it was about, their own side on it from the views engine, said as a stand; with no side of theirs, two beats. Told once by the house; someone too young for stands does not raise it. Whom it reached is not read yet (stopgap SG-DIRECTOR-town-change-reach-unread). Names and numbers only; no sentence.

## `askedWho.about`

Lead, Nov 13, 2026 ("Who's behind it?" answered "Not that I read."): the reply pieces that ask who is behind a story. They are offered as the why move but answered as a who: the answer reads `said-who` and names the bill's sponsor where the record has one.
