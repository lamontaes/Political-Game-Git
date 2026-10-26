# Words in thirty scenes: grading batch batch-bill-names

Thirty different scenes from one place, Bowers, Delaware, played 365 days from 2026-10-12 (seed `78863a91ed86f4f43ff68ff8859c63deda24e7992716d846c3bdcb7ee25f7341`). Its year passed real local laws: 2026-1 ("Police Oversight Ordinance"); 2026-2 ("Mixed-Income Housing Ordinance"); 2026-3 ("Missing Middle Housing Ordinance").

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: 5 lines and 2 alternatives used a part you failed or marked conditional; 0 lines or alternatives were not whole English. In all 5 lines were left out: held-by-grades 5.

| Scene kind                 | Scenes |
| -------------------------- | ------ |
| A family scene at home     | 2      |
| A chapter of "My life"     | 4      |
| A conversation turn        | 3      |
| A meeting                  | 2      |
| The minutes                | 3      |
| Bill text                  | 3      |
| A notice                   | 2      |
| A rally                    | 3      |
| Election night or an honor | 5      |
| An interview               | 2      |

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to `data/english/grades/batch-bill-names.json`:

```json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
```

`node --import tsx scripts/dialogue-batch/apply-grades.ts` folds them into the part ledger.

## Facts that were stood in

- Bowers: 4 decided races, office levels federal/state/city/county; bills and roll calls are the legislature module's own rows (7 local bills, 1657 recorded votes); interviews are the press module's

## OWNER DECISIONS NEEDED

- no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet
- defect for OPUS-GOV: 2 local bill(s) passed with no title on record (2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line; 2027-1, budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line/budget-line); a bill needs a title the words can name
- A town body member's words to the chair: the meeting bank holds Congress's floor procedure, which a town council never hears, so no member speaks to the chair until a local body's own words are mined.
- Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.
- Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.
- A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.
- Only 29 different scenes passed: the world held no more scenes whose phrases were not already shown.

## The scenes

### 0. A family scene at home

The scene: A family scene at home in Bowers, November 11, 2026: Megan Stone, 34, with Joshua Stone; turn 1.

How it was made: Fired by the director from the record job:public:staff:person_452d343dfdaa3a0c:person_c16640e2cbb9a3d0 (money:job-started), staged at home because it is the household's own news (situation "celebration"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your son is with you.
2. Narrator: You got a job.
3. Joshua Stone: Where do you work?

| #   | Reply                                                | Lie | Good here? |
| --- | ---------------------------------------------------- | --- | ---------- |
| 1   | I'm with County of Kent treasury. Where do you work? |     |            |
| 2   | I'm with County of Kent treasury.                    |     |            |
| 3   | With County of Kent treasury.                        |     |            |
| 4   | All right.                                           |     |            |
| 5   | Not at the moment. Where do you work?                | yes |            |
| 6   | I work for Wnit.                                     | yes |            |
| 7   | Not at the moment.                                   | yes |            |
|     | (Say nothing)                                        |     |            |

### 1. A chapter of "My life"

The scene: The "My life" journal of Ian McMahon, chapter "Bowers, Delaware".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Ian McMahon: **Kelly was elected. I had no idea.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Kelly got elected. I had no idea.              |         |

### 2. A conversation turn

The scene: Ian McMahon talks with Jennifer Villarreal, October 25, 2026, turn 1; the talk's topic: home:person_452d363dfdaa3d72.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The lies are what the scales offer: the same moves made false about the player's own record. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jennifer Villarreal: Hi, Ian.
2. Jennifer Villarreal: Where do you come from?

| #   | Reply                            | Lie | Good here? |
| --- | -------------------------------- | --- | ---------- |
| 1   | I'm from Bowers. And you?        |     |            |
| 2   | I was born and raised in Bowers. |     |            |
| 3   | I'm from Bowers.                 |     |            |
| 4   | Here in Bowers.                  |     |            |
| 5   | Not here. And you?               | yes |            |
| 6   | Not here.                        | yes |            |
|     | (Say nothing)                    |     |            |

### 3. A meeting

The scene: The County of Kent Board of Commissioners takes up 2026-1 ("Police Oversight Ordinance"); the recorded result is enacted.

How it was made: the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step

Tests one thing: the wording of line 1 on one axis (word choice).

1. Sarah Rose (chair): **The meeting will come to order.**
2. Sarah Rose (chair): All in favor?
3. Sarah Rose (chair): The motion carries.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | The committee will come to order.              |         |

### 4. The minutes

The scene: The roll call on 2026-1 ("Police Oversight Ordinance") before the County of Kent Board of Commissioners: 6 for, 1 against; the bill enacted. Each name is read from a member's recorded vote.

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners (minutes): Voting for this action: Cynthia Burgess, Sarah Rose, Shirley Rose, Melissa Pickett, William Villarreal and Michelle Villarreal.
2. County of Kent Board of Commissioners (minutes): Voting against this action: Taylor Knight.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 5. Bill text

The scene: Its short title. 2026-1 (enacted), introduced October 27, 2026 before the County of Kent Board of Commissioners: the Police Oversight Ordinance, which adopts "Civilian oversight of police" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners (bill text): This Ordinance may be cited as the "Police Oversight Ordinance".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 6. A notice

The scene: A hearing notice for 2026-1, posted by the County of Kent Board of Commissioners.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners clerk: NOTICE OF PUBLIC HEARING / PROJECT NAME: "Police Oversight Ordinance" / DATE OF MEETING: October 27, 2026

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 7. A rally

The scene: Steve Page speaks at a rally in Bowers as a candidate for U.S. Senator.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Steve Page: Thank you very much.
2. Steve Page: My name is Steve Page.
3. Steve Page: God bless you.
4. Steve Page: **Thank you very much.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you so much.                             |         |

### 8. Election night or an honor

The scene: Vickie O'Connor won the race for U.S. Representative against Julie Sweet (the voting module's recorded result) and speaks on election night.

How it was made: composeAddress (src/english/english-composition.ts), register victory, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (formality).

1. Vickie O'Connor: **I'm grateful.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I am grateful.                               |         |

### 9. An interview

The scene: A local reporter's interview of Vickie O'Connor (a candidate in Bowers, 2026-10-19); asked about "Graduated income tax"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the wording of line 2 on one axis (formality).

1. Vickie O'Connor: You have my word.
2. Vickie O'Connor: **I will.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | I'll do it.                                  |         |

### 10. A family scene at home

The scene: A family scene at home in Bowers, August 16, 2027: Shirley Rose, 76, with Bo Rose; turn 1.

How it was made: Fired by the director from the record health.serious-illness:person_f1c9d27a78d52d1d:2027-08-16 (feeling:event:health.serious-illness), staged at home because it is the household's own news (situation "news-arrives"). The talk opens on that record (the occasion), and asking for more is answered from the records (the jobs engine's search, the housing engine's case). The replies are the four the engine offers this turn; say nothing is the smaller control beside them.

Tests one thing: the choice set: mark each reply good or bad here, in this scene.

1. Narrator: Your son is with you.
2. Bo Rose: Can I talk to you?
3. Bo Rose: How's Paul doing?

| #   | Reply                 | Lie | Good here? |
| --- | --------------------- | --- | ---------- |
| 1   | He's doing well.      |     |            |
| 2   | Thank you for asking. |     |            |
| 3   | All right.            |     |            |
| 4   | Okay.                 |     |            |
|     | (Say nothing)         |     |            |

### 11. A chapter of "My life"

The scene: The "My life" journal of Selena McMahon, chapter "Bowers, Delaware".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated November 3, 2026

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Selena McMahon: **Kelly won. I didn't realize it at the time.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Kelly won. I didn't know at the time.          |         |

### 12. A conversation turn

The scene: Ian McMahon talks with Jennifer Villarreal, November 18, 2026, turn 1; the talk's topic: person_82e98f739f272cc0>own-work:person_82e98f739f272cc0.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Jennifer Villarreal: Good to see you, Ian.
2. Jennifer Villarreal: I'm working for Town of Bowers.

| #   | Reply                              | Lie | Good here? |
| --- | ---------------------------------- | --- | ---------- |
| 1   | How long have you been doing that? |     |            |
| 2   | I see.                             |     |            |
| 3   | Oh.                                |     |            |
| 4   | All right.                         |     |            |
|     | (Say nothing)                      |     |            |

### 13. A meeting

The scene: Kelly McMahon speaks in the public comment period of a Bowers council meeting.

How it was made: composeAddress (src/english/english-composition.ts), register public-comment, words from data/english/parts/address.json

Tests one thing: the wording of line 1 on one axis (word choice).

1. Kelly McMahon: **Thank you for the opportunity to comment.**
2. Kelly McMahon: My name is Kelly McMahon, and I live in Bowers.
3. Kelly McMahon: Thank you for your time.

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you for having me.                       |         |

### 14. The minutes

The scene: The discussion of "Police Oversight Ordinance" at the October 27, 2026 meeting (2026-1).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners (minutes): The staff provided an update on "Police Oversight Ordinance".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 15. Bill text

The scene: Its long title. 2026-1 (enacted), introduced October 27, 2026 before the County of Kent Board of Commissioners: the Police Oversight Ordinance, which adopts "Civilian oversight of police" on the bill's own provision record.

How it was made: composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners (bill text): To provide for a civilian board to review the police, and for other purposes.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 16. A notice

The scene: The notice of the November 7, 2028 election in Bowers, from the contests the elections module holds.

How it was made: composeFromBank over data/english/parts/notices.json

Tests one thing: the scene as it stands.

1. Bowers election office: NOTICE OF ELECTION / NOTICE IS HEREBY GIVEN that an election will be held in Bowers on November 7, 2028 for the following Officers: President, Governor, Lieutenant Governor, Insurance Commissioner, Commissioner, State Representative and U.S. Representative.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 17. A rally

The scene: Vickie O'Connor speaks at a rally in Bowers as a candidate for U.S. Representative.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Vickie O'Connor: Thank you.
2. Vickie O'Connor: I grew up in Bowers.
3. Vickie O'Connor: We can do this.
4. Vickie O'Connor: **Thank you all.**

| #   | Another way to say the bold line (word choice) | Better? |
| --- | ---------------------------------------------- | ------- |
| 1   | Thank you.                                     |         |

### 18. Election night or an honor

The scene: Julie Sweet lost the race for U.S. Representative to Vickie O'Connor (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/english/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the scene as it stands.

1. Julie Sweet: I wish her well.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 19. An interview

The scene: A local reporter's interview of Vickie O'Connor (a candidate in Bowers, 2026-10-19); asked about "Shift highway funds to transit"; the candidate's recorded answer is support.

How it was made: composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows

Tests one thing: the scene as it stands.

1. Vickie O'Connor: That's a promise.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 20. A chapter of "My life"

The scene: The "My life" journal of Ivy McMahon, chapter "My daughter".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated May 7, 1974

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Ivy McMahon: My daughter was born.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 21. A conversation turn

The scene: Ian McMahon talks with Kelly McMahon, November 30, 2026, turn 1; the talk's topic: person_452d343dfdaa3a0c>mutual:person_82e990739f272e73.

How it was made: The talk opens from the place and occasion, then the biggest recorded event of either person in the director's ledger, else what they share; it keeps to that topic and may lead to one related one. The scales are dim: nothing about the player's own record is in play, or the listener already knows it. Say nothing is the smaller control beside the replies.

Tests one thing: the choice set: mark each reply and each lie good or bad here.

1. Kelly McMahon: Have you talked to William?

| #   | Reply                                    | Lie | Good here? |
| --- | ---------------------------------------- | --- | ---------- |
| 1   | Have you?                                |     |            |
| 2   | I saw William Villarreal on November 22. |     |            |
| 3   | No.                                      |     |            |
| 4   | All right.                               |     |            |
|     | (Say nothing)                            |     |            |

### 22. The minutes

The scene: The discussion of "Mixed-Income Housing Ordinance" at the October 27, 2026 meeting (2026-2).

How it was made: composeFromBank over data/english/parts/minutes.json

Tests one thing: the scene as it stands.

1. County of Kent Board of Commissioners (minutes): Participants discussed "Mixed-Income Housing Ordinance".

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 23. Bill text

The scene: The opening of S. 1 (failed), filed in the Senate on October 13, 2026.

How it was made: composeFromBank over data/english/parts/legislation.json

Tests one thing: the wording of line 1 on one axis (length).

1. United States Congress (bill text): **Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled,**

| #   | Another way to say the bold line (length)                         | Better? |
| --- | ----------------------------------------------------------------- | ------- |
| 1   | Resolved by the House of Representatives (the Senate concurring), |         |

### 24. A rally

The scene: Rowan Davis speaks at a rally in Bowers as a candidate for Auditor of Accounts.

How it was made: composeAddress (src/english/english-composition.ts), register campaign, words from data/english/parts/address.json

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Rowan Davis: It's great to be here.
2. Rowan Davis: I was born and raised in Bowers.
3. Rowan Davis: Tell your friends.
4. Rowan Davis: **Thank you, and God bless.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | God bless you, and God bless America.        |         |

### 25. Election night or an honor

The scene: Karen Trujillo won the race for Attorney General against Daniel Ochoa (the voting module's recorded result) and speaks on election night.

How it was made: composeAddress (src/english/english-composition.ts), register victory, words from data/english/parts/address.json

Tests one thing: the scene as it stands.

1. Karen Trujillo: I am humbled.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 26. A chapter of "My life"

The scene: The "My life" journal of Ivy McMahon, chapter "Kelly".

How it was made: composeJournal (src/director/journal.ts), words from data/english/parts/journal.json entry dated July 14, 1977

Tests one thing: the opening and closing pair: does the closing line follow from the opening, here?.

1. Ivy McMahon: **Kelly was born. I'll never forget that.**

| #   | Another way to say the bold line (formality) | Better? |
| --- | -------------------------------------------- | ------- |
| 1   | Kelly was born. I never knew.                |         |

### 27. Election night or an honor

The scene: Daniel Ochoa lost the race for Attorney General to Karen Trujillo (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/english/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the scene as it stands.

1. Daniel Ochoa: We didn't win.

No other wording in the bank fits this line on one axis; grade the scene as it stands.

### 28. Election night or an honor

The scene: Judith Sampson lost the race for Treasurer to Mary Ferguson (the voting module's recorded result) and concedes.

How it was made: composeAddress (src/english/english-composition.ts), register concession, words from data/english/parts/address.json

Tests one thing: the scene as it stands.

1. Judith Sampson: We will be back.

No other wording in the bank fits this line on one axis; grade the scene as it stands.
