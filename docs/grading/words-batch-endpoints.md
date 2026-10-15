# Words in thirty scenes: grading batch batch-endpoints

Thirty different scenes from one place, Reserve, Kansas, played 365 days from 2026-10-12 (seed `afc3297a2e3b9ae890eee9e6820e769ef3d01f4c27160bde458b2391f167c186`). Its year passed real local laws: 2026-1 ("Partner with federal immigration enforcement"); 2026-2 ("Allow multifamily in single family zones"); 2026-3 ("Right to counsel in eviction"); 2026-4 ("Civilian oversight of police"). Places drawn before it and passed over: Tonganoxie, Kansas: the played world stopped before its year ended (Public pay does not match its actual owned work obligation.).

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every scene states what it is for (owner, Oct 15, evening): money, a bill or the player's political life, and a family talk is a personal scene only; a scene with no endpoint is left out. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 7 lines and 1 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 7 lines were left out: held-by-grades 7.

| Scene kind             | Scenes |
| ---------------------- | ------ |
| A family scene at home | 2      |
| A chapter of "My life" | 5      |
| A meeting              | 2      |
| The minutes            | 3      |
| Bill text              | 3      |
| A notice               | 2      |
| A rally                | 2      |
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

- Reserve: 0 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (9 local bills, 5239 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced
- defect for OPUS-GOV: 2 local bill(s) passed with no title on record (2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line; 2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.
- Only 22 different scenes passed: the world held no more scenes whose phrases were not already shown.

## The scenes

### 0. A family scene at home

The scene: A family scene at home in Reserve, March 20, 2027: Matthew O'Neal, 14, with Sage O'Neal; turn 1.

What it is for: Money: it follows a household's income, rent or a public budget.

How it was made: Fired by the director from the record employer-closed:2027-03-20:organization_7cc723c46bbf7182 (money:job-ended), staged at home because it is the household's own news (situation "news-arrives"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your father is there.
2. Sage O'Neal: Let's talk.
3. Sage O'Neal: I lost my job.

| #   | Reply                   | Lie | Good here? |
| --- | ----------------------- | --- | ---------- |
| 1   | What happened?          |     |            |
| 2   | Okay.                   |     |            |
| 3   | I'm sorry to hear that. |     |            |
| 4   | All right.              |     |            |
|     | (Say nothing)           |     |            |

### 1. A chapter of "My life"

The scene: The "My life" journal of Megan Wise, chapter "Reserve, Kansas".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Megan Wise: **My mother won. I didn't realize it at the time.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | My mother won. I didn't know at the time.      |         |

### 2. A meeting

The scene: The City of Reserve council takes up 2026-1 ("Partner with federal immigration enforcement"); the recorded result is enacted.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Eden Neal (chair): **The meeting will come to order.**
2. Eden Neal (chair): All in favor?
3. Eden Neal (chair): The motion carries.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 3. The minutes

The scene: The roll call on 2026-1 ("Partner with federal immigration enforcement") before the City of Reserve council: 5 for, 0 against; the bill enacted. Each name is read from a member's recorded vote.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. City of Reserve council (minutes): Voting for this action: Eden Neal, Sandra Sanford, Parker Rivas, Peter Patrick and Michael Vazquez.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 4. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the City of Reserve council: it adopts "Partner with federal immigration enforcement" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. City of Reserve council (bill text): This Act may be cited as the "Partner with federal immigration enforcement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. A notice

The scene: A hearing notice for 2026-1, posted by the City of Reserve council.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. City of Reserve council clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Partner with federal immigration enforcement" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A rally

The scene: David Wynn speaks at a rally in Reserve as a candidate for U.S. Senator.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. David Wynn: Thank you very much.
2. David Wynn: I grew up in Reserve.
3. David Wynn: I need your vote.
4. David Wynn: **Thank you, and God bless.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | God bless you, and God bless America.        |         |

### 7. An interview

The scene: A local reporter's interview of Laurie Cruz (a candidate in Reserve, 2026-10-19); asked about "Shift highway funds to transit"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Laurie Cruz: You have my word.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 8. A family scene at home

The scene: A family scene at home in Reserve, April 10, 2027: Sage O'Neal, 35, with Samuel O'Neal; turn 1.

What it is for: Money: it follows a household's income, rent or a public budget.

How it was made: Fired by the director from the record job:public:staff:person_79cd0acca0f837c4:person_dc6c8b60f1d89acb (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your son is here too.
2. Narrator: You got a job.
3. Samuel O'Neal: What do you think?

| #   | Reply               | Lie | Good here? |
| --- | ------------------- | --- | ---------- |
| 1   | No kidding.         |     |            |
| 2   | I heard about that. |     |            |
| 3   | I think it's great. |     |            |
| 4   | All right.          |     |            |
|     | (Say nothing)       |     |            |

### 9. A chapter of "My life"

The scene: The "My life" journal of Lucia Wise, chapter "My son".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated January 18, 1997

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lucia Wise: My son was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 10. A meeting

The scene: Lucia Wise speaks in the public comment period of a Reserve council meeting.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Lucia Wise: **Good evening.**
2. Lucia Wise: I live in Reserve.
3. Lucia Wise: That's all I have.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Good evening, everyone.                        |         |

### 11. The minutes

The scene: The discussion of "Partner with federal immigration enforcement" at the October 27, 2026 meeting (2026-1).

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. City of Reserve council (minutes): The staff provided an update on "Partner with federal immigration enforcement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 12. Bill text

The scene: Its short title. 2026-2 (enacted), introduced October 27, 2026 before the City of Reserve council: it adopts "Allow multifamily in single family zones" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. City of Reserve council (bill text): This title may be cited as the "Allow multifamily in single family zones".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 13. A notice

The scene: The notice of the November 7, 2028 election in Reserve, from the contests the elections module holds.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Reserve election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Reserve on November 7, 2028 for the following Officers: President, U.S. Senator, Commissioner, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 14. A rally

The scene: Sharon Salazar speaks at a rally in Reserve as a candidate for U.S. Representative.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Sharon Salazar: Thank you all for being here.
2. Sharon Salazar: My name is Sharon Salazar.
3. Sharon Salazar: God bless America.
4. Sharon Salazar: **Thank you.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you all.                                 |         |

### 15. An interview

The scene: A local reporter's interview of Laurie Cruz (a candidate in Reserve, 2026-10-19); asked about "Automatic voter registration"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Laurie Cruz: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A chapter of "My life"

The scene: The "My life" journal of Lucia Wise, chapter "Eric".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated May 6, 2000

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lucia Wise: Eric was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. The minutes

The scene: The discussion of "Allow multifamily in single family zones" at the October 27, 2026 meeting (2026-2).

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. City of Reserve council (minutes): Participants discussed "Allow multifamily in single family zones".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 18. Bill text

The scene: Its long title. 2026-3 (enacted), introduced October 27, 2026 before the City of Reserve council: it adopts "Right to counsel in eviction" on the bill's own provision record.

What it is for: A bill: it is part of how a bill is named, noticed, argued, voted on or reported.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. City of Reserve council (bill text): To provide for right to counsel in eviction, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 19. An interview

The scene: A local reporter's interview of Laurie Cruz (a candidate in Reserve, 2026-10-19); asked about "Clean electricity standard"; the candidate's recorded answer is support.

What it is for: The player's political life: it is a contact, a campaign, a vote or an office in the player's path.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Laurie Cruz: I'll do it.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 20. A chapter of "My life"

The scene: The "My life" journal of Lucia Wise, chapter "Megan".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated May 8, 2009

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lucia Wise: **Megan was born. I'll never forget that.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Megan was born. I never knew.                |         |

### 21. A chapter of "My life"

The scene: The "My life" journal of Lucia Wise, chapter "Alex".

What it is for: A personal scene: the family's own news, with little bearing on play for now.

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated January 10, 2018 entry dated November 3, 2026 entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lucia Wise: Alex was born. That was a turning point.
2. Lucia Wise: We won.
3. Lucia Wise: **Kristina Wheeler was a good friend. Kristina Wheeler became a commissioner.**

| #   | Another way to say the bold line (word choice)                                 | Better? |
| --- | ------------------------------------------------------------------------------ | ------- |
| 1   | Kristina Wheeler was a friend of mine. Kristina Wheeler became a commissioner. |         |
