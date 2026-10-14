# Words in thirty scenes: grading batch batch-10

Thirty different scenes from one place, Plainfield, Vermont, played 365 days from 2026-10-12 (seed `4c049093b212897d84033ff06e1936e958b2e6ea312f4199c59ae87e684b77f7`). Its year passed real local laws: 2026-1 ("Paid family leave"); 2026-2 ("Rent stabilization"); 2026-3 ("Inclusionary requirement"); 2026-4 ("Right to counsel in eviction"); 2026-5 ("Civilian oversight of police"); H.R. 1 ("Balanced operating budget"); S. 1 ("Minimum reserve balance"); S. 2 ("Fund pensions to schedule"); H.R. 3 ("Restrict abortion"); H.R. 4 ("Ban lobbying after office"); 2027-1 ("2027-1"); 2027-1 ("2027-1"); H.R. 21 ("H.R. 21").

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 7 lines and 22 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 7 lines were left out: held-by-grades 7.

| Scene kind                 | Scenes |
| -------------------------- | ------ |
| A chapter of "My life"     | 3      |
| A conversation turn        | 5      |
| A meeting                  | 5      |
| A hearing                  | 2      |
| The minutes                | 2      |
| Bill text                  | 3      |
| A notice                   | 2      |
| A rally                    | 2      |
| Election night or an honor | 4      |
| An interview               | 2      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-10.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Plainfield: 1 decided races, office levels federal/state/township/county; bills and roll calls are the legislature module's own rows (54 local bills, 12421 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.

## The scenes

### 0. A chapter of "My life"

The scene: The "My life" journal of Carson Harrison, chapter "Plainfield, Vermont".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026 entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Carson Harrison: My mother lost. I never knew.
2. Carson Harrison: **My father won. That was a turning point.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | My father won. I'll never forget that.       |         |

### 1. A conversation turn

The scene: Carson Harrison talks with Barbara Harrison, day 1, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Carson Harrison's traits (conversation.reply-reach: leans toward carrying the talk on, 0.15). The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Barbara Harrison: Good to see you, Carson.
2. Barbara Harrison: Where do you come from?

| #   | Reply                | Lie | Good here? |
| --- | -------------------- | --- | ---------- |
| 1   | I grew up here.      |     |            |
| 2   | I'm from Plainfield. |     |            |
| 3   | Right here.          |     |            |
| 4   | All right.           |     |            |
| 5   | Not here.            | yes |            |
|     | (Say nothing)        |     |            |

### 2. A meeting

The scene: The Town of Plainfield selectboard takes up 2026-1 ("Paid family leave"); the recorded result is enacted.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (formality).

1. Selena Chan (chair): **The meeting will come to order.**
2. Selena Chan (chair): All in favor?
3. Selena Chan (chair): The motion carries.

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Please state your name for the record.       |         |

### 3. A hearing

The scene: A hearing on 2026-1 ("Paid family leave") before the Town of Plainfield selectboard; the witness is Grace Chan, a resident.

How it was made: composeFromBank over data/english/parts/hearing.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Grace Chan (witness): **Thank you.**
2. Grace Chan (witness): That is a great question.
3. Selena Chan (chair): All right.
4. Grace Chan (witness): Very good.

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you, sir.                              |         |

### 4. The minutes

The scene: The roll call on 2026-1 ("Paid family leave") before the Town of Plainfield selectboard: 2 for, 1 against; the bill enacted. Each name is read from a member's recorded vote.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard (minutes): Voting for this action: Selena Chan and Daniel Chavez.
2. Town of Plainfield selectboard (minutes): Voting against this action: Jeffrey Mendoza.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the Town of Plainfield selectboard: it adopts "Paid family leave" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard (bill text): This title may be cited as the "Paid family leave".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A notice

The scene: A hearing notice for 2026-1, posted by the Town of Plainfield selectboard.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Paid family leave" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 7. A rally

The scene: Richard Pearson speaks at a rally in Plainfield as a candidate for U.S. Representative.

How it was made: composeAddress (src/presentation/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Richard Pearson: Thank you all for coming.
2. Richard Pearson: I grew up in Plainfield.
3. Richard Pearson: Get out and vote.
4. Richard Pearson: **Thank you all.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you.                                     |         |

### 8. Election night or an honor

The scene: Selena Chan won the race for Selectboard member against Heather Harrison (the voting module's recorded result) and speaks on election night.

How it was made: composeAddress (src/presentation/english-composition.ts), register victory, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Selena Chan: **I am humbled.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'm grateful.                                |         |

### 9. An interview

The scene: A local reporter's interview of Ashley Moss (a candidate in Plainfield, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 1 on one axis (formality).

1. Ashley Moss: **That's a promise.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I will.                                      |         |

### 10. A chapter of "My life"

The scene: The "My life" journal of Stephen Harrison, chapter "Plainfield, Vermont".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Stephen Harrison: **Heather won. Little did I know.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Heather won. I didn't know at the time.      |         |

### 11. A conversation turn

The scene: Carson Harrison talks with Barbara Harrison, day 1, turn 2.

How it was made: The replies are the four the engine offers this turn, ranked by Carson Harrison's traits (conversation.reply-reach: leans toward carrying the talk on, 0.15). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Carson Harrison: Not here.
2. Barbara Harrison: Yeah.
3. Barbara Harrison: How is your mother?

| #   | Reply              | Lie | Good here? |
| --- | ------------------ | --- | ---------- |
| 1   | Good.              |     |            |
| 2   | Thanks for asking. |     |            |
| 3   | All right.         |     |            |
| 4   | Okay.              |     |            |
|     | (Say nothing)      |     |            |

### 12. A meeting

The scene: A member of the Town of Plainfield selectboard speaks to the chair during 2026-1 ("Paid family leave").

How it was made: composeFromBank over data/english/parts/meeting.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Selena Chan (member): **Madam Chair, I thank the chair for the time.**
2. Selena Chan (member): Madam Chair, I have a motion to recommit at the desk.
3. Selena Chan (member): Madam Chair, I hope my colleagues will join me in voting for the motion to recommit.

| #   | Another way to say the bold line (word choice)          | Better? |
| --- | ------------------------------------------------------- | ------- |
| 1   | Madam Chair, I thank the chairman for yielding me time. |         |

### 13. A hearing

The scene: A hearing on 2026-2 ("Rent stabilization") before the Town of Plainfield selectboard; the witness is Yasmin Mendoza, a resident.

How it was made: composeFromBank over data/english/parts/hearing.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Yasmin Mendoza (witness): **Thank you, Madam Chair.**
2. Yasmin Mendoza (witness): Thank you for that question.
3. Selena Chan (chair): Without objection, so ordered.
4. Yasmin Mendoza (witness): I completely agree.

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you, Chair.                            |         |

### 14. The minutes

The scene: The discussion of "Paid family leave" at the October 27, 2026 meeting (2026-1).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard (minutes): Participants discussed "Paid family leave".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 15. Bill text

The scene: Its long title. 2026-1 (enacted), introduced October 27, 2026 before the Town of Plainfield selectboard: it adopts "Paid family leave" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard (bill text): To provide for paid family leave, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A notice

The scene: The notice of the November 7, 2028 election in Plainfield, from the contests the elections module holds.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Plainfield election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Plainfield on November 7, 2028 for the following Officers: President, U.S. Senator, Governor, Lieutenant Governor, Attorney General, Secretary of State, Treasurer, Auditor of Accounts, State Senator, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. A rally

The scene: Robert Saunders speaks at a rally in Plainfield as a candidate for Attorney General.

How it was made: composeAddress (src/presentation/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Robert Saunders: It's good to be back in Plainfield.
2. Robert Saunders: I was born and raised in Plainfield.
3. Robert Saunders: Tell your friends.
4. Robert Saunders: **Thank you, and God bless.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | God bless you, and God bless America.        |         |

### 18. Election night or an honor

The scene: Heather Harrison lost the race for Selectboard member to Selena Chan (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/presentation/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Heather Harrison: **This is not the end.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Thank you for everything.                    |         |

### 19. An interview

The scene: A local reporter's interview of Richard Pearson (a candidate in Plainfield, 2026-10-19); asked about "Graduated income tax"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 1 on one axis (formality).

1. Richard Pearson: **You have my word.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'll do it.                                  |         |

### 20. A chapter of "My life"

The scene: The "My life" journal of Yasmin Mendoza, chapter "Selectboard member".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated March 2, 2027

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Yasmin Mendoza: **My father got elected.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | My father was elected.                         |         |

### 21. A conversation turn

The scene: Carson Harrison talks with Karen Morales, day 4, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Carson Harrison's traits (conversation.reply-reach: leans toward carrying the talk on, 0.15). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Karen Morales: Hi.
2. Karen Morales: How's Stephen doing?

| #   | Reply                                   | Lie | Good here? |
| --- | --------------------------------------- | --- | ---------- |
| 1   | I talked to Stephen Harrison yesterday. |     |            |
| 2   | No, I haven't.                          |     |            |
| 3   | All right.                              |     |            |
| 4   | Why?                                    |     |            |
|     | (Say nothing)                           |     |            |

### 22. A meeting

The scene: A member of the Town of Plainfield selectboard speaks to the chair during 2026-3 ("Inclusionary requirement").

How it was made: composeFromBank over data/english/parts/meeting.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Selena Chan (member): **Madam Chair, I rise today with a heavy heart.**
2. Selena Chan (member): Madam Chair, I have no further speakers.

| #   | Another way to say the bold line (word choice)           | Better? |
| --- | -------------------------------------------------------- | ------- |
| 1   | Madam Chair, I rise today with a profound sense of loss. |         |

### 23. Bill text

The scene: Its short title. 2026-2 (enacted), introduced October 27, 2026 before the Town of Plainfield selectboard: it adopts "Rent stabilization" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. Town of Plainfield selectboard (bill text): This Act may be cited as the "Rent stabilization".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 24. Election night or an honor

The scene: Jeffrey Mendoza honors Selena Chan, a fellow sitting official, on the floor.

How it was made: composeAddress (src/presentation/english-composition.ts), register house-honor, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Jeffrey Mendoza: **Madam Speaker, I rise today to celebrate Selena Chan.**
2. Jeffrey Mendoza: Please join me in congratulating Selena Chan.
3. Jeffrey Mendoza: Madam Speaker, I yield back the balance of my time.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Madam Speaker, I rise to honor Selena Chan.    |         |

### 25. A conversation turn

The scene: Carson Harrison talks with Heather Harrison, day 5, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Carson Harrison's traits (conversation.reply-reach: leans toward carrying the talk on, 0.15). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Heather Harrison: Hi there.
2. Heather Harrison: I'm working for County of Washington treasury.

| #   | Reply                              | Lie | Good here? |
| --- | ---------------------------------- | --- | ---------- |
| 1   | Oh, County of Washington treasury. |     |            |
| 2   | Right.                             |     |            |
| 3   | How long have you been there?      |     |            |
| 4   | All right.                         |     |            |
|     | (Say nothing)                      |     |            |

### 26. A meeting

The scene: A member of the Town of Plainfield selectboard speaks to the chair during 2026-4 ("Right to counsel in eviction").

How it was made: composeFromBank over data/english/parts/meeting.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Selena Chan (member): **Madam Chair, I rise today to honor the life of a true public servant.**
2. Selena Chan (member): Madam Chair, I will be brief.

| #   | Another way to say the bold line (word choice)                     | Better? |
| --- | ------------------------------------------------------------------ | ------- |
| 1   | Madam Chair, I thank the vice chair of the committee for yielding. |         |

### 27. Election night or an honor

The scene: Sasha Flynn honors Daniel Chavez, a fellow sitting official, on the floor.

How it was made: composeAddress (src/presentation/english-composition.ts), register house-honor, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Sasha Flynn: **Mr. Speaker, I rise to recognize Daniel Chavez.**
2. Sasha Flynn: Daniel Chavez worked at Plainfield Market for 5 years.
3. Sasha Flynn: Congratulations, Daniel Chavez.
4. Sasha Flynn: I yield back the balance of my time.

| #   | Another way to say the bold line (word choice)        | Better? |
| --- | ----------------------------------------------------- | ------- |
| 1   | Mr. Speaker, I rise today to celebrate Daniel Chavez. |         |

### 28. A conversation turn

The scene: Carson Harrison talks with Jack Walter, day 11, turn 1.

How it was made: The replies are the four the engine offers this turn, ranked by Carson Harrison's traits (conversation.reply-reach: leans toward carrying the talk on, 0.15). The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jack Walter: Hello, Carson.
2. Jack Walter: You remember Twinfield Union School?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | Of course.            |     |            |
| 2   | That was a while ago. |     |            |
| 3   | Yes, I remember.      |     |            |
| 4   | Yes, I do.            |     |            |
|     | (Say nothing)         |     |            |

### 29. A meeting

The scene: Stephen Harrison speaks in the public comment period of a Plainfield council meeting.

How it was made: composeAddress (src/presentation/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Stephen Harrison: **Good evening.**
2. Stephen Harrison: My name is Stephen Harrison, and I live in Plainfield.
3. Stephen Harrison: That's all I have.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Good evening, everyone.                        |         |
