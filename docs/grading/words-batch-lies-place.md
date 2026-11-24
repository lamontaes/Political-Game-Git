# Words in thirty scenes: grading batch batch-lies-place

Thirty different scenes from one place, Wheeler, Washington, played 365 days from 2026-10-12 (seed `1c7234cc3ca740ca7df317249052fddb68089dff0c4f1ccc5cb7068ebec47948`). Its year passed real local laws: 2026-1 ("Inclusionary requirement").

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 1 lines and 1 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 1 lines were left out: held-by-grades 1.

| Scene kind                 | Scenes |
| -------------------------- | ------ |
| A family scene at home     | 3      |
| A chapter of "My life"     | 6      |
| A conversation turn        | 3      |
| A meeting                  | 3      |
| The minutes                | 2      |
| Bill text                  | 3      |
| A notice                   | 2      |
| A rally                    | 2      |
| Election night or an honor | 2      |
| An interview               | 3      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-lies-place.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Wheeler: 1 decided races, office levels federal/state/county; bills and roll calls are the legislature module's own rows (2 local bills, 4851 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- defect for OPUS-GOV: 1 local bill(s) passed with no title on record (2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.
- Only 29 different scenes passed: the world held no more scenes whose phrases were not already shown.

## The scenes

### 0. A family scene at home

The scene: A family scene at home in Wheeler, February 1, 2027: Lauren Rasmussen, 31, with Farhan Rasmussen; turn 1.

How it was made: Fired by the director from the record job:position:organization_4b9393f253caa945:2027-02-01:1:person_6df8aeeedb1bdcce (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your partner is there.
2. Narrator: You got a job.
3. Farhan Rasmussen: What do you do?

| #   | Reply                                                | Lie | Good here? |
| --- | ---------------------------------------------------- | --- | ---------- |
| 1   | I'm working for Taylor Manufacturing.                |     |            |
| 2   | I'm with Taylor Manufacturing.                       |     |            |
| 3   | All right.                                           |     |            |
| 4   | I'm working for Taylor Manufacturing. How about you? |     |            |
| 5   | Not right now.                                       | yes |            |
| 6   | I work for Grant County Garage.                      | yes |            |
| 7   | I work for Grant County Garage. How about you?       | yes |            |
|     | (Say nothing)                                        |     |            |

### 1. A chapter of "My life"

The scene: The "My life" journal of Lauren Spencer, chapter "My daughter".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated February 19, 2004

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lauren Spencer: My daughter was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 2. A conversation turn

The scene: Anthony Spencer talks with Jason Lyons, January 17, 2027, turn 1; the talk's topic: home:person_499e8c0595b3a78e.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jason Lyons: Hello there.
2. Jason Lyons: Where do you come from?

| #   | Reply                                | Lie | Good here? |
| --- | ------------------------------------ | --- | ---------- |
| 1   | I'm from Wheeler. Where do you live? |     |            |
| 2   | I grew up here.                      |     |            |
| 3   | I'm from Wheeler.                    |     |            |
| 4   | Right here.                          |     |            |
| 5   | I'm from Olympia. Where do you live? | yes |            |
| 6   | I'm from Olympia.                    | yes |            |
|     | (Say nothing)                        |     |            |

### 3. A meeting

The scene: The County of Grant Board of County Commissioners takes up 2026-1 ("Inclusionary requirement"); the recorded result is enacted.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Patricia Holland (chair): **The meeting will come to order.**
2. Patricia Holland (chair): All in favor?
3. Patricia Holland (chair): The motion carries.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 4. The minutes

The scene: The roll call on 2026-1 ("Inclusionary requirement") before the County of Grant Board of County Commissioners: 3 for, 0 against; the bill enacted. Each name is read from a member's recorded vote.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Grant Board of County Commissioners (minutes): Voting for this action: Patricia Holland, Ella Martinez and Eric Gilbert.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the County of Grant Board of County Commissioners: it adopts "Inclusionary requirement" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Grant Board of County Commissioners (bill text): This Act may be cited as the "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A notice

The scene: A hearing notice for 2026-1, posted by the County of Grant Board of County Commissioners.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. County of Grant Board of County Commissioners clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Inclusionary requirement" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 7. A rally

The scene: Christopher Rojas speaks at a rally in Wheeler as a candidate for U.S. Representative.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Christopher Rojas: It's good to be back in Wheeler.
2. Christopher Rojas: I grew up in Wheeler.
3. Christopher Rojas: We can do this.
4. Christopher Rojas: **Thank you.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you all.                                 |         |

### 8. Election night or an honor

The scene: Christopher Rojas won the race for U.S. Representative against John Gibbs (the voting module's recorded result) and speaks on election night.

How it was made: composeAddress (src/english/english-composition.ts), register victory, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Christopher Rojas: **I'm grateful.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I am grateful.                               |         |

### 9. An interview

The scene: A local reporter's interview of Aaron Pruitt (a candidate in Wheeler, 2026-10-19); asked about "Exempt groceries from sales tax"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Aaron Pruitt: You have my word.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 10. A family scene at home

The scene: A family scene at home in Wheeler, July 6, 2027: Amy Pittman, 49, with Justin Pittman; turn 1.

How it was made: Fired by the director from the record life.death:person_1dc598312f8dd2b9:2027-07-06 (feeling:event:life.death), staged at home because it is the household's own news (situation "news-arrives"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your partner is with you.
2. Justin Pittman: Can I talk to you?
3. Justin Pittman: How's Liam?

| #   | Reply              | Lie | Good here? |
| --- | ------------------ | --- | ---------- |
| 1   | Doing well.        |     |            |
| 2   | Thanks for asking. |     |            |
| 3   | All right.         |     |            |
| 4   | Okay.              |     |            |
|     | (Say nothing)      |     |            |

### 11. A chapter of "My life"

The scene: The "My life" journal of Lauren Spencer, chapter "Olivia".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated February 25, 2007

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lauren Spencer: Olivia was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 12. A conversation turn

The scene: Anthony Spencer talks with Melissa Lyons, January 29, 2027, turn 2; the talk's topic: home:person_499e8c0595b3a78e.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Anthony Spencer: I'm from Wheeler. How about you?
2. Melissa Lyons: I live in Wheeler.

| #   | Reply         | Lie | Good here? |
| --- | ------------- | --- | ---------- |
| 1   | Oh.           |     |            |
| 2   | I see.        |     |            |
| 3   | Same here.    |     |            |
| 4   | All right.    |     |            |
|     | (Say nothing) |     |            |

### 13. A meeting

The scene: Lauren Spencer speaks in the public comment period of a Wheeler council meeting.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Lauren Spencer: **Thank you for the opportunity to speak.**
2. Lauren Spencer: My name is Lauren Spencer, and I live in Wheeler.
3. Lauren Spencer: Thank you very much.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you for letting me speak.                |         |

### 14. The minutes

The scene: The discussion of "Inclusionary requirement" at the October 27, 2026 meeting (2026-1).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Grant Board of County Commissioners (minutes): The staff provided an update on "Inclusionary requirement".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 15. Bill text

The scene: Its long title. 2026-1 (enacted), introduced October 27, 2026 before the County of Grant Board of County Commissioners: it adopts "Inclusionary requirement" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Grant Board of County Commissioners (bill text): To provide for inclusionary requirement, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A notice

The scene: The notice of the November 7, 2028 election in Wheeler, from the contests the elections module holds.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Wheeler election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Wheeler on November 7, 2028 for the following Officers: President, U.S. Senator, Governor, Lieutenant Governor, Attorney General, Secretary of State, Treasurer, State Auditor, Commissioner of Public Lands, Superintendent of Public Instruction (nonpartisan), Insurance Commissioner, State Senator, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. A rally

The scene: Patricia Holland speaks at a rally in Wheeler as a candidate for County Commissioner.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Patricia Holland: It's great to be home.
2. Patricia Holland: I was born and raised in Wheeler.
3. Patricia Holland: Get out and vote.
4. Patricia Holland: **Thank you, and God bless.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | God bless you, and God bless America.        |         |

### 18. Election night or an honor

The scene: John Gibbs lost the race for U.S. Representative to Christopher Rojas (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/english/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. John Gibbs: **I congratulate Christopher Rojas.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | I want to congratulate Christopher Rojas.      |         |

### 19. An interview

The scene: A local reporter's interview of Christopher Rojas (a candidate in Wheeler, 2026-10-19); asked about "Right to work"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Christopher Rojas: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 20. A family scene at home

The scene: A family scene at home in Wheeler, July 6, 2027: Liam Pittman, 27, with Amy Pittman; turn 1.

How it was made: Fired by the director from the record life.death:person_1dc598312f8dd2b9:2027-07-06 (feeling:event:life.death), staged at home because it is the household's own news (situation "news-arrives"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your mother is with you.
2. Amy Pittman: Can we talk?
3. Amy Pittman: Have you seen Justin?

| #   | Reply                         | Lie | Good here? |
| --- | ----------------------------- | --- | ---------- |
| 1   | Why?                          |     |            |
| 2   | I talked to Justin yesterday. |     |            |
| 3   | No, I haven't.                |     |            |
| 4   | All right.                    |     |            |
|     | (Say nothing)                 |     |            |

### 21. A chapter of "My life"

The scene: The "My life" journal of Lauren Spencer, chapter "My son".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated July 18, 2009

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lauren Spencer: My son was born. That was a turning point.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 22. A conversation turn

The scene: Anthony Spencer talks with Olivia Spencer, April 11, 2027, turn 1; the talk's topic: person_9ea8720698451c36>mutual:person_702a0cf83bf7c3d0.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Olivia Spencer: Have you seen Jason Lyons?

| #   | Reply                              | Lie | Good here? |
| --- | ---------------------------------- | --- | ---------- |
| 1   | Have you?                          |     |            |
| 2   | I saw Jason Lyons a few weeks ago. |     |            |
| 3   | No.                                |     |            |
| 4   | All right.                         |     |            |
|     | (Say nothing)                      |     |            |

### 23. A meeting

The scene: Morgan Spencer speaks in the public comment period of a Wheeler council meeting.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Morgan Spencer: **Thank you for the opportunity to comment.**
2. Morgan Spencer: I live in Wheeler.
3. Morgan Spencer: That's all I have.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you for having me.                       |         |

### 24. Bill text

The scene: The opening of H.R. 1 (failed), filed in the House on October 13, 2026.

How it was made: composeFromBank over data/english/parts/legislation.json

Tests one thing: the wording of line 1 on one axis (length).

1. United States Congress (bill text): **Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,**

| #   | Another way to say the bold line (length)                         | Better? |
| --- | ----------------------------------------------------------------- | ------- |
| 1   | Resolved by the House of Representatives (the Senate concurring), |         |

### 25. An interview

The scene: A local reporter's interview of Aaron Pruitt (a candidate in Wheeler, 2026-10-19); asked about "Stand your ground"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 1 on one axis (formality).

1. Aaron Pruitt: **I will.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'll do it.                                  |         |

### 26. A chapter of "My life"

The scene: The "My life" journal of Lauren Spencer, chapter "County clerk".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated March 8, 2027 entry dated March 8, 2027

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Lauren Spencer: So I ran.
2. Lauren Spencer: **Jason Lyons and I were good friends. He later became county assessor.**

| #   | Another way to say the bold line (word choice)                  | Better? |
| --- | --------------------------------------------------------------- | ------- |
| 1   | Jason Lyons was a good friend. He later became county assessor. |         |

### 27. A chapter of "My life"

The scene: The "My life" journal of Michael Spencer, chapter "My son".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated July 18, 2009

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Michael Spencer: **My son was born. I'll never forget that.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | My son was born. I never knew.               |         |

### 28. A chapter of "My life"

The scene: The "My life" journal of Michael Spencer, chapter "County clerk".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated March 8, 2027

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Michael Spencer: I worked with Justin Pittman. Justin Pittman became coroner.

No other wording in the bank fits this line on one axis; grade the scene as it stands.
