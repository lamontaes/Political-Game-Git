# Words in thirty scenes: grading batch batch-11

Thirty different scenes from one place, Pine Ridge, South Carolina, played 365 days from 2026-10-12 (seed `e61d8fa46a0749ac77137170f5459e3eed9c4a0fe478668052ca4b6166bd8ffe`). Its year passed real local laws: 2026-1 ("Partner with federal immigration enforcement"); 2026-2 ("Limit groundwater withdrawal"); 2026-3 ("Allow multifamily in single family zones"); 2026-4 ("Universal preschool"); 2026-5 ("Raise minimum wage"); 2026-13 ("Raise minimum wage"); 2026-14 ("Right to counsel in eviction"); 2026-15 ("Inclusionary requirement"); 2026-16 ("Restrict government facial recognition"); 2026-17 ("Legalize cannabis sales"); 2026-18 ("Legalize cannabis sales"); 2026-19 ("Limit groundwater withdrawal"); 2026-20 ("Inclusionary requirement"); 2027-1 ("Restrict government facial recognition"). Places drawn before it and passed over: Kilbourne, Illinois: no family scene fired in the year.

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 12 lines and 1 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 12 lines were left out: held-by-grades 12.

| Scene kind                 | Scenes |
| -------------------------- | ------ |
| A family scene at home     | 2      |
| A chapter of "My life"     | 5      |
| A conversation turn        | 5      |
| A meeting                  | 3      |
| The minutes                | 3      |
| Bill text                  | 3      |
| A notice                   | 2      |
| A rally                    | 2      |
| Election night or an honor | 2      |
| An interview               | 3      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-11.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Pine Ridge: 1 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (23 local bills, 11778 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- defect for OPUS-GOV: 1 local bill(s) passed with no title on record (2027-2, no provisions); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.

## The scenes

### 0. A family scene at home

The scene: A family scene at home in Pine Ridge, July 5, 2027: Brandon Vasquez, 37, with Timothy Vasquez; turn 1.

How it was made: Fired by the director from the record job:position:organization_901d74dbe0e3bcd2:2027-07-01:2:person_7d07aaaeb2721b06 (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your son, your daughter, your son, your father, your mother, your brother, your sister, your sister, your brother, your brother and your sister are here.
2. Narrator: You got a job.
3. Timothy Vasquez: Have a seat.
4. Timothy Vasquez: What are you doing now?

| #   | Reply                                                          | Lie | Good here? |
| --- | -------------------------------------------------------------- | --- | ---------- |
| 1   | I'm working for Stout's Market.                                |     |            |
| 2   | At Stout's Market.                                             |     |            |
| 3   | All right.                                                     |     |            |
| 4   | I'm working for Stout's Market. Where do you work?             |     |            |
| 5   | Not right now.                                                 | yes |            |
| 6   | I'm at Pine Ridge Area Workers Union Local.                    | yes |            |
| 7   | I'm at Pine Ridge Area Workers Union Local. Where do you work? | yes |            |
|     | (Say nothing)                                                  |     |            |

### 1. A chapter of "My life"

The scene: The "My life" journal of Madeline Meyer, chapter "Pine Ridge, South Carolina".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Madeline Meyer: **My father was elected. I didn't know what that meant.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | My father was elected. Little did I know.    |         |

### 2. A conversation turn

The scene: Madeline Meyer talks with Nicole Rollins, October 13, 2026, turn 1; the talk's topic: shared-school:person_90463a68c1eefcea:p8-deep-past-v1:school:middle.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Nicole Rollins: Hi there.
2. Nicole Rollins: You remember Spaulding Middle?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | Yeah.                 |     |            |
| 2   | That was 6 years ago. |     |            |
| 3   | I remember that.      |     |            |
| 4   | Yes, I do.            |     |            |
|     | (Say nothing)         |     |            |

### 3. A meeting

The scene: The County of Darlington commissioner takes up 2026-1 ("Partner with federal immigration enforcement"); the recorded result is enacted.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Jasper Newton (chair): **The meeting will come to order.**
2. Jasper Newton (chair): All in favor?
3. Jasper Newton (chair): The motion carries.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 4. The minutes

The scene: The roll call on 2026-1 ("Partner with federal immigration enforcement") before the County of Darlington commissioner: 6 for, 1 against; the bill enacted. Each name is read from a member's recorded vote.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (minutes): Voting for this action: Jasper Newton, Arthur Kent, Martin Nelson, John Rollins, Diana Newton and Amy Frazier.
2. County of Darlington commissioner (minutes): Voting against this action: Donna Newton.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the County of Darlington commissioner: it adopts "Partner with federal immigration enforcement" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (bill text): This title may be cited as the "Partner with federal immigration enforcement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A notice

The scene: A hearing notice for 2026-1, posted by the County of Darlington commissioner.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. County of Darlington commissioner clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Partner with federal immigration enforcement" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 7. A rally

The scene: Melissa Marshall speaks at a rally in Pine Ridge as a candidate for U.S. Senator.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Melissa Marshall: It's great to be here.
2. Melissa Marshall: My name is Melissa Marshall.
3. Melissa Marshall: Get out and vote.
4. Melissa Marshall: **Thank you so much.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you very much.                           |         |

### 8. Election night or an honor

The scene: official:term:seat:US-SC:attorney-general:2027-05-12 won the race for Attorney General against Adam Akhtar (the voting module's recorded result) and speaks on election night.

How it was made: composeAddress (src/english/english-composition.ts), register victory, words from data/english/parts/address.json

Tests one thing: the scene as it stands.

1. official:term:seat:US-SC:attorney-general:2027-05-12: I am humbled.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 9. An interview

The scene: A local reporter's interview of Rachel Evans (a candidate in Pine Ridge, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Rachel Evans: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 10. A family scene at home

The scene: A family scene at home in Pine Ridge, September 6, 2027: Katherine Anderson, 41, with Maya Anderson; turn 1.

How it was made: Fired by the director from the record job:position:organization_901d74dbe0e3bcd2:2027-09-01:1:person_a12852a8acd5fa7d (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your brother, your daughter, your daughter, your daughter, your daughter, your father and your mother are here.
2. Narrator: You got a job.
3. Maya Anderson: Can we talk?
4. Maya Anderson: Where are you working now?

| #   | Reply                                                          | Lie | Good here? |
| --- | -------------------------------------------------------------- | --- | ---------- |
| 1   | At Stout's Market.                                             |     |            |
| 2   | I'm at Stout's Market.                                         |     |            |
| 3   | All right.                                                     |     |            |
| 4   | At Stout's Market. How about you?                              |     |            |
| 5   | Not at the moment.                                             | yes |            |
| 6   | I work for Darlington County Cleaning Services.                | yes |            |
| 7   | I work for Darlington County Cleaning Services. How about you? | yes |            |
|     | (Say nothing)                                                  |     |            |

### 11. A chapter of "My life"

The scene: The "My life" journal of Teresa Stark, chapter "My daughter".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated October 1, 1965 entry dated December 10, 1968

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Teresa Stark: My daughter was born.
2. Teresa Stark: My daughter was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 12. A conversation turn

The scene: Madeline Meyer talks with Donna Meyer, October 25, 2026, turn 1; the talk's topic: home:person_90463a68c1eefcea.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Donna Meyer: Hi, Madeline.
2. Donna Meyer: Where do you come from?

| #   | Reply                         | Lie | Good here? |
| --- | ----------------------------- | --- | ---------- |
| 1   | I'm from Pine Ridge. And you? |     |            |
| 2   | I grew up in Pine Ridge.      |     |            |
| 3   | I'm from Pine Ridge.          |     |            |
| 4   | Right here in Pine Ridge.     |     |            |
| 5   | Not here. And you?            | yes |            |
| 6   | Not here.                     | yes |            |
|     | (Say nothing)                 |     |            |

### 13. A meeting

The scene: Teresa Stark speaks in the public comment period of a Pine Ridge council meeting.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Teresa Stark: **Good morning, Commissioners.**
2. Teresa Stark: I live in Pine Ridge.
3. Teresa Stark: Thank you for your consideration.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Good evening.                                  |         |

### 14. The minutes

The scene: The discussion of "Partner with federal immigration enforcement" at the October 27, 2026 meeting (2026-1).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (minutes): Participants discussed "Partner with federal immigration enforcement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 15. Bill text

The scene: Its short title. 2026-3 (enacted), introduced October 27, 2026 before the County of Darlington commissioner: it adopts "Allow multifamily in single family zones" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (bill text): This Act may be cited as the "Allow multifamily in single family zones".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A notice

The scene: The notice of the November 7, 2028 election in Pine Ridge, from the contests the elections module holds.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Pine Ridge election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Pine Ridge on November 7, 2028 for the following Officers: President, U.S. Senator, State Representative, Commissioner, Sheriff, Solicitor, County clerk, County treasurer, County assessor, Coroner and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. A rally

The scene: Rachel Evans speaks at a rally in Pine Ridge as a candidate for Governor.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Rachel Evans: It's good to be home.
2. Rachel Evans: I was born and raised in Pine Ridge.
3. Rachel Evans: I need your vote.
4. Rachel Evans: **God bless you, and God bless America.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you, and God bless.                    |         |

### 18. Election night or an honor

The scene: Adam Akhtar lost the race for Attorney General to official:term:seat:US-SC:attorney-general:2027-05-12 (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/english/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Adam Akhtar: **This is not the end.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you for everything.                    |         |

### 19. An interview

The scene: A local reporter's interview of Renee Guerrero (a candidate in Pine Ridge, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Renee Guerrero: You have my word.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 20. A chapter of "My life"

The scene: The "My life" journal of Teresa Stark, chapter "My child".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated June 28, 1974

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Teresa Stark: My child was born. That was a turning point.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 21. A conversation turn

The scene: Madeline Meyer talks with Donna Meyer, October 25, 2026, turn 2; the talk's topic: home:person_90463a68c1eefcea.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Madeline Meyer: I'm from Pine Ridge.
2. Donna Meyer: I see.
3. Donna Meyer: Where did you go to school?

| #   | Reply                              | Lie | Good here? |
| --- | ---------------------------------- | --- | ---------- |
| 1   | I graduated from Spaulding Middle. |     |            |
| 2   | I graduated.                       |     |            |
| 3   | All right.                         |     |            |
| 4   | Okay.                              |     |            |
|     | (Say nothing)                      |     |            |

### 22. A meeting

The scene: Keanu Meyer speaks in the public comment period of a Pine Ridge council meeting.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Keanu Meyer: **Thank you for the opportunity to speak.**
2. Keanu Meyer: My name is Keanu Meyer, and I live in Pine Ridge.
3. Keanu Meyer: Thank you.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you for letting me speak.                |         |

### 23. The minutes

The scene: The discussion of "Allow multifamily in single family zones" at the October 27, 2026 meeting (2026-3).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (minutes): The staff provided an update on "Allow multifamily in single family zones".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 24. Bill text

The scene: Its long title. 2026-4 (enacted), introduced October 27, 2026 before the County of Darlington commissioner: it adopts "Universal preschool" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Darlington commissioner (bill text): To provide for universal preschool, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 25. An interview

The scene: A local reporter's interview of Rachel Evans (a candidate in Pine Ridge, 2026-10-19); asked about "Restrict abortion"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 1 on one axis (formality).

1. Rachel Evans: **I will.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'll do it.                                  |         |

### 26. A chapter of "My life"

The scene: The "My life" journal of Keanu Meyer, chapter "My daughter".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated October 15, 2008

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Keanu Meyer: **My daughter was born. I'll never forget that.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | My daughter was born. I never knew.          |         |

### 27. A conversation turn

The scene: Madeline Meyer talks with Donna Newton, November 18, 2026, turn 1; the talk's topic: person_9c8a4644eb126b1d>mutual:person_ddec7a3b56294740.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Donna Newton: Hey, Madeline.
2. Donna Newton: Have you talked to Diana?

| #   | Reply                             | Lie | Good here? |
| --- | --------------------------------- | --- | ---------- |
| 1   | Have you seen Diana?              |     |            |
| 2   | I talked to Diana on November 13. |     |            |
| 3   | No, I haven't.                    |     |            |
| 4   | All right.                        |     |            |
|     | (Say nothing)                     |     |            |

### 28. A chapter of "My life"

The scene: The "My life" journal of Elise Vasquez, chapter "Darlington County, South Carolina".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Elise Vasquez: **My father was elected.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | My father got elected.                         |         |

### 29. A conversation turn

The scene: Madeline Meyer talks with Aiden Schmidt, March 18, 2027, turn 2; the talk's topic: home:person_90463a68c1eefcea.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Madeline Meyer: I'm from Pine Ridge. How about you?
2. Aiden Schmidt: I live in Pine Ridge.

| #   | Reply           | Lie | Good here? |
| --- | --------------- | --- | ---------- |
| 1   | Right.          |     |            |
| 2   | Oh, Pine Ridge. |     |            |
| 3   | Me too.         |     |            |
| 4   | All right.      |     |            |
|     | (Say nothing)   |     |            |
