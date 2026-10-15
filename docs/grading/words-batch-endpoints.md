# Words in thirty scenes: grading batch batch-endpoints

Thirty different scenes from one place, Bangor, Maine, played 365 days from 2026-10-12 (seed `9d1f3e27aba8e99928f487bec383bf7134ae5d2d3dd3eb38a4699ee9ec9e364e`). Its year passed real local laws: 2026-1 ("Inclusionary requirement"); 2026-2 ("Rent stabilization"); 2026-3 ("Civilian oversight of police"); 2026-4 ("Right to counsel in eviction"); 2026-5 ("Inclusionary requirement"); 2027-1 ("Rent stabilization"); 2027-5 ("Right to counsel in eviction"). Places drawn before it and passed over: Tonganoxie, Kansas: the played world stopped before its year ended (Public pay does not match its actual owned work obligation.); Reserve, Kansas: the played world stopped before its year ended (api is not defined).

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every scene states what it is for (owner, Oct 15, evening): money, a bill or the player's political life, and a family talk is a personal scene only; a scene with no endpoint is left out. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 11 lines and 5 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 11 lines were left out: held-by-grades 11.

| Scene kind             | Scenes |
| ---------------------- | ------ |
| A family scene at home | 2      |
| A chapter of "My life" | 6      |
| A conversation turn    | 5      |
| A meeting              | 3      |
| The minutes            | 2      |
| Bill text              | 3      |
| A notice               | 2      |
| A rally                | 1      |
| An interview           | 3      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-endpoints.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Bangor: 0 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (13 local bills, 6517 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced
- defect for OPUS-GOV: 2 local bill(s) passed with no title on record (2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line; 2027-3, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.
- Only 27 different scenes passed: the world held no more scenes whose phrases were not already shown.

## The scenes

### 0. A family scene at home

The scene: A family scene at home in Bangor, December 1, 2026: Paul Barnett, 48, with Heather Barnett; turn 1.

What it is for: Money: it follows a household's income, rent or a public budget.

How it was made: Fired by the director from the record event:organization.owner-changed:organization_3af95d4a348ca666:2026-12-01 (money:job-ended), staged at home because it is the household's own news (situation "news-arrives"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your partner is here.
2. Heather Barnett: Sit down.
3. Heather Barnett: I lost my job.

| #   | Reply                   | Lie | Good here? |
| --- | ----------------------- | --- | ---------- |
| 1   | Okay.                   |     |            |
| 2   | I'm sorry to hear that. |     |            |
| 3   | All right.              |     |            |
| 4   | I see.                  |     |            |
|     | (Say nothing)           |     |            |

### 1. A chapter of "My life"

The scene: The "My life" journal of Priya Stone, chapter "My daughter".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated October 13, 2008

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Priya Stone: My daughter was born. That was a turning point.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 2. A conversation turn

The scene: Emily Stone talks with Jackson Hernandez, October 13, 2026, turn 1; the talk's topic: shared-school:person_189ea5219ccc88b3:p8-deep-past-v1:school:middle.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jackson Hernandez: Hi.
2. Jackson Hernandez: You remember James F. Doughty School?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | Yeah.                 |     |            |
| 2   | That was 6 years ago. |     |            |
| 3   | Oh, yes.              |     |            |
| 4   | I do remember.        |     |            |
|     | (Say nothing)         |     |            |

### 3. A meeting

The scene: The County of Penobscot Board of County Commissioners takes up 2026-1 ("Inclusionary requirement"); the recorded result is failed.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Erika Freeman (chair): **The meeting will come to order.**
2. Erika Freeman (chair): All in favor?
3. Erika Freeman (chair): The noes have it.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 4. The minutes

The scene: The roll call on 2026-1 ("Inclusionary requirement") before the County of Penobscot Board of County Commissioners: 1 for, 1 against; the bill failed. Each name is read from a member's recorded vote.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners (minutes): Voting for this action: Elena Rodgers.
2. County of Penobscot Board of County Commissioners (minutes): Voting against this action: Erika Freeman.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. Bill text

The scene: Its short title. 2026-1 (failed), introduced October 27, 2026 before the County of Penobscot Board of County Commissioners: it adopts "Inclusionary requirement" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners (bill text): This Act may be cited as the "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A notice

The scene: A hearing notice for 2026-1, posted by the County of Penobscot Board of County Commissioners.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Inclusionary requirement" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 7. A rally

The scene: Janet Strong speaks at a rally in Bangor as a candidate for U.S. Senator.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Janet Strong: I'm glad to be here.
2. Janet Strong: I was born and raised in Bangor.
3. Janet Strong: God bless America.
4. Janet Strong: **God bless you, and God bless America.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you, and God bless.                    |         |

### 8. An interview

The scene: A local reporter's interview of Diane Saunders (a candidate in Bangor, 2026-10-19); asked about "Raise minimum wage"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 1 on one axis (formality).

1. Diane Saunders: **I will.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'll do it.                                  |         |

### 9. A family scene at home

The scene: A family scene at home in Bangor, June 7, 2027: Erika Freeman, 31, with Kimberly Freeman; turn 1.

What it is for: Money: it follows a household's income, rent or a public budget.

How it was made: Fired by the director from the record job:position:organization_29c30d734a1376b1:2027-06-01:1:person_077ca4d9d9c847dd (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your mother is here too.
2. Narrator: You got a job.
3. Kimberly Freeman: What do you think?

| #   | Reply            | Lie | Good here? |
| --- | ---------------- | --- | ---------- |
| 1   | That's terrible. |     |            |
| 2   | I saw that.      |     |            |
| 3   | It's about time. |     |            |
| 4   | All right.       |     |            |
|     | (Say nothing)    |     |            |

### 10. A chapter of "My life"

The scene: The "My life" journal of Priya Stone, chapter "My son".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 20, 2010

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Priya Stone: **My son was born. I'll never forget that.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | My son was born. I never knew.               |         |

### 11. A conversation turn

The scene: Emily Stone talks with Jackson Gomez, October 25, 2026, turn 1; the talk's topic: shared-school:person_189ea5219ccc88b3:p8-deep-past-v1:school:middle.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jackson Gomez: Good to see you.
2. Jackson Gomez: Do you remember James F. Doughty School?

| #   | Reply                         | Lie | Good here? |
| --- | ----------------------------- | --- | ---------- |
| 1   | Yes.                          |     |            |
| 2   | That was a long time ago.     |     |            |
| 3   | James F. Doughty School, yes. |     |            |
| 4   | Yes, I do.                    |     |            |
|     | (Say nothing)                 |     |            |

### 12. A meeting

The scene: Avery Stone speaks in the public comment period of a Bangor council meeting.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Avery Stone: **Thank you for the opportunity to comment.**
2. Avery Stone: My name is Avery Stone, and I live in Bangor.
3. Avery Stone: Thank you very much.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you for having me.                       |         |

### 13. The minutes

The scene: The discussion of "Inclusionary requirement" at the October 27, 2026 meeting (2026-1).

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners (minutes): The staff provided an update on "Inclusionary requirement".
2. City of Bangor council (minutes): Participants discussed "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 14. Bill text

The scene: Its long title. 2026-1 (failed), introduced October 27, 2026 before the County of Penobscot Board of County Commissioners: it adopts "Inclusionary requirement" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners (bill text): To provide for inclusionary requirement, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 15. A notice

The scene: The notice of the November 7, 2028 election in Bangor, from the contests the elections module holds.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Bangor election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Bangor on November 7, 2028 for the following Officers: President, Council member, County Commissioner, State Senator, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. An interview

The scene: A local reporter's interview of Diane Saunders (a candidate in Bangor, 2026-10-19); asked about "Local minimum wage authority"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Diane Saunders: You have my word.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. A chapter of "My life"

The scene: The "My life" journal of Debbie Morgan, chapter "My son".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated March 6, 1966

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Debbie Morgan: My son was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 18. A conversation turn

The scene: Emily Stone talks with Caleb Sellers, November 30, 2026, turn 1; the talk's topic: person_8b0c93c3effa12a4>mutual:person_189ea7219ccc8c19.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Caleb Sellers: Good to see you, Emily.
2. Caleb Sellers: Have you talked to Priya?

| #   | Reply                    | Lie | Good here? |
| --- | ------------------------ | --- | ---------- |
| 1   | Why?                     |     |            |
| 2   | I talked to Priya today. |     |            |
| 3   | No.                      |     |            |
| 4   | All right.               |     |            |
|     | (Say nothing)            |     |            |

### 19. A meeting

The scene: Dennis Stone speaks in the public comment period of a Bangor council meeting.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Dennis Stone: **Good evening.**
2. Dennis Stone: My name is Dennis Stone.
3. Dennis Stone: Thank you for your consideration.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Good evening, everyone.                        |         |

### 20. Bill text

The scene: Its short title. 2026-2 (failed), introduced October 27, 2026 before the County of Penobscot Board of County Commissioners: it adopts "Civilian oversight of police" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Penobscot Board of County Commissioners (bill text): This title may be cited as the "Civilian oversight of police".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 21. An interview

The scene: A local reporter's interview of Diane Saunders (a candidate in Bangor, 2026-10-19); asked about "Graduated income tax"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Diane Saunders: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 22. A chapter of "My life"

The scene: The "My life" journal of Debbie Morgan, chapter "Christopher".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated April 2, 1975

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Debbie Morgan: Christopher was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 23. A conversation turn

The scene: Emily Stone talks with Christopher Freeman, December 24, 2026, turn 1; the talk's topic: person_9c5fd33833557635>mutual:person_077ca4d9d9c847dd.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Christopher Freeman: Hi there.
2. Christopher Freeman: Have you seen Erika?

| #   | Reply                       | Lie | Good here? |
| --- | --------------------------- | --- | ---------- |
| 1   | How about you?              |     |            |
| 2   | I saw Erika on December 14. |     |            |
| 3   | No, I haven't.              |     |            |
| 4   | All right.                  |     |            |
|     | (Say nothing)               |     |            |

### 24. A chapter of "My life"

The scene: The "My life" journal of Elizabeth Harper, chapter "Hancock County, Maine".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 30, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Elizabeth Harper: **I moved to Hancock County, Maine.**

| #   | Another way to say the bold line (length) | Better? |
| --- | ----------------------------------------- | ------- |
| 1   | We moved.                                 |         |

### 25. A conversation turn

The scene: Emily Stone talks with Nicole Hopkins, July 16, 2027, turn 1; the talk's topic: home:person_189ea5219ccc88b3.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Nicole Hopkins: Hey.
2. Nicole Hopkins: Where are you from?

| #   | Reply                            | Lie | Good here? |
| --- | -------------------------------- | --- | ---------- |
| 1   | I'm from Bangor. How about you?  |     |            |
| 2   | I was born and raised in Bangor. |     |            |
| 3   | I'm from Bangor.                 |     |            |
| 4   | Right here in Bangor.            |     |            |
| 5   | Not here. How about you?         | yes |            |
| 6   | Not here.                        | yes |            |
|     | (Say nothing)                    |     |            |

### 26. A chapter of "My life"

The scene: The "My life" journal of Caleb Cruz, chapter "Bangor, Maine".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Caleb Cruz: **Robert won.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Robert lost.                                   |         |
